import type { IStickyElement, IStrokeBbox } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { MIN_STICKY_SIZE } from "@/features/board/constants/board.constant";
import { ensureAutoFontSize } from "./sticky.bbox";
import { applyRectResize } from "@engine/elements/shared/resize";
import { rectBbox } from "@engine/utils/bbox";

// Копирует sticky со сдвигом. bbox обнуляется, чтобы пересчитался при добавлении в store.
export function cloneSticky(
  el: IStickyElement,
  offsetX: number,
  offsetY: number,
  _resolver: IElementResolver,
): IStickyElement {
  return {
    ...el,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    x: el.x + offsetX,
    y: el.y + offsetY,
    bbox: undefined,
  };
}

// Снимок sticky для history-entry. bbox клонируется глубоко.
export interface IStickySnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  html: string;
  text: string;
  fontSize: number;
  autoFontSize: boolean;
  textAlign: "left" | "center" | "right";
  bbox: IStrokeBbox | undefined;
}

// Снимает текущее состояние sticky.
export function takeStickySnapshot(el: IStickyElement): IStickySnapshot {
  return {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    color: el.color,
    html: el.html,
    text: el.text,
    fontSize: el.fontSize,
    autoFontSize: el.autoFontSize,
    textAlign: el.textAlign,
    bbox: el.bbox ? { ...el.bbox } : undefined,
  };
}

// Восстанавливает состояние sticky из снимка.
export function restoreStickySnapshot(
  el: IStickyElement,
  snapshot: unknown,
): void {
  const snap = snapshot as IStickySnapshot;
  el.x = snap.x;
  el.y = snap.y;
  el.width = snap.width;
  el.height = snap.height;
  el.color = snap.color;
  el.html = snap.html;
  el.text = snap.text;
  el.fontSize = snap.fontSize;
  el.autoFontSize = snap.autoFontSize;
  el.textAlign = snap.textAlign;
  el.bbox = snap.bbox ? { ...snap.bbox } : undefined;
}

// Сдвигает sticky на (dx, dy). bbox пересобирается из новых координат.
export function applyStickyMove(
  el: IStickyElement,
  snapshot: unknown,
  dx: number,
  dy: number,
): void {
  const snap = snapshot as IStickySnapshot;
  el.x = snap.x + dx;
  el.y = snap.y + dy;
  el.bbox = rectBbox(el.x, el.y, el.width, el.height);
}

// Resize-операция для sticky: свободно в обе стороны до MIN_STICKY_SIZE.
// Текст auto-fit сжимается до STICKY_MIN_FONT_SIZE — данные не теряются,
// при последующем grow вернутся к комфортному размеру.
export function applyStickyResize(
  el: IStickyElement,
  snapshot: unknown,
  anchorX: number,
  anchorY: number,
  scaleX: number,
  scaleY: number,
  _avgScale: number,
): void {
  const snap = snapshot as IStickySnapshot;
  const r = applyRectResize(
    { x: snap.x, y: snap.y, width: snap.width, height: snap.height },
    anchorX,
    anchorY,
    scaleX,
    scaleY,
    { minWidth: MIN_STICKY_SIZE, minHeight: MIN_STICKY_SIZE },
  );
  el.x = r.x;
  el.y = r.y;
  el.width = r.width;
  el.height = r.height;
  ensureAutoFontSize(el);
  el.bbox = rectBbox(el.x, el.y, el.width, el.height);
}
