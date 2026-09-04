import type { ITextElement, IStrokeBbox } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { MIN_TEXT_FONT_SIZE } from "@/features/board/constants/board.constant";
import { computePlainTextBbox, computeRichTextBbox } from "./text.bbox";

// Снимок текстового элемента для history-entry.
export interface ITextSnapshot {
  text: string;
  html?: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  textAlign?: "left" | "center" | "right";
  bbox: IStrokeBbox | undefined;
}

// Копирует текст со сдвигом. bbox тоже сдвигается без пересчёта.
export function cloneText(
  el: ITextElement,
  offsetX: number,
  offsetY: number,
  _resolver: IElementResolver,
): ITextElement {
  return {
    ...el,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    x: el.x + offsetX,
    y: el.y + offsetY,
    bbox: el.bbox
      ? {
          minX: el.bbox.minX + offsetX,
          minY: el.bbox.minY + offsetY,
          maxX: el.bbox.maxX + offsetX,
          maxY: el.bbox.maxY + offsetY,
        }
      : undefined,
  };
}

// Снимает текущее состояние текста.
export function takeTextSnapshot(el: ITextElement): ITextSnapshot {
  return {
    text: el.text,
    html: el.html,
    x: el.x,
    y: el.y,
    fontSize: el.fontSize,
    color: el.color,
    textAlign: el.textAlign,
    bbox: el.bbox ? { ...el.bbox } : undefined,
  };
}

// Восстанавливает состояние из снимка.
export function restoreTextSnapshot(el: ITextElement, snapshot: unknown): void {
  const snap = snapshot as ITextSnapshot;
  el.text = snap.text;
  el.html = snap.html;
  el.x = snap.x;
  el.y = snap.y;
  el.fontSize = snap.fontSize;
  el.color = snap.color;
  el.textAlign = snap.textAlign;
  el.bbox = snap.bbox ? { ...snap.bbox } : undefined;
}

// Сдвигает текст на (dx, dy) и переносит bbox без пересчёта.
export function applyTextMove(
  el: ITextElement,
  snapshot: unknown,
  dx: number,
  dy: number,
): void {
  const snap = snapshot as ITextSnapshot;
  el.x = snap.x + dx;
  el.y = snap.y + dy;
  if (snap.bbox) {
    el.bbox = {
      minX: snap.bbox.minX + dx,
      minY: snap.bbox.minY + dy,
      maxX: snap.bbox.maxX + dx,
      maxY: snap.bbox.maxY + dy,
    };
  }
}

// Resize: позиция от якоря, fontSize пропорционально avgScale (но не меньше MIN_TEXT_FONT_SIZE).
// bbox пересчитывается через нужную из двух функций (rich или plain).
//
// При scale ниже того, что нужен для min font-size, позиция тоже клампится по тому же
// порогу — иначе текст «уплывал» бы в сторону якоря после того, как шрифт уже упёрся в пол,
// а при отрицательном scale (drag сквозь якорь) ещё и флипался бы.
export function applyTextResize(
  el: ITextElement,
  snapshot: unknown,
  anchorX: number,
  anchorY: number,
  scaleX: number,
  scaleY: number,
  avgScale: number,
): void {
  const snap = snapshot as ITextSnapshot;
  const minScale = MIN_TEXT_FONT_SIZE / snap.fontSize;
  const effectiveScaleX = Math.max(minScale, scaleX);
  const effectiveScaleY = Math.max(minScale, scaleY);
  const effectiveAvg = Math.max(minScale, avgScale);
  el.x = anchorX + (snap.x - anchorX) * effectiveScaleX;
  el.y = anchorY + (snap.y - anchorY) * effectiveScaleY;
  el.fontSize = snap.fontSize * effectiveAvg;
  el.bbox = el.html
    ? computeRichTextBbox(el)
    : computePlainTextBbox(el.text, el.fontSize, el.x, el.y);
}
