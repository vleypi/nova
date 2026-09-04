import type { IShapeElement, IStrokeBbox } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { rectBbox } from "@engine/utils/bbox";
import { applyRectResize } from "@engine/elements/shared/resize";
import { MIN_SHAPE_SIZE } from "@/features/board/constants/board.constant";

// Глубокая копия фигуры со смещением и новым id. Bbox сбрасывается, computeBbox
// вызовет caller (PasteHandler так делает для всех handler-ов).
export function cloneShape(
  el: IShapeElement,
  offsetX: number,
  offsetY: number,
  _resolver: IElementResolver,
): IShapeElement {
  return {
    ...el,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    x: el.x + offsetX,
    y: el.y + offsetY,
    bbox: undefined,
  };
}

// Снимок shape для history-entry. Включает текстовые поля, иначе
// shouldRecordEditShape не увидит правок текста и WS не получит обновления.
export interface IShapeSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
  shapeKind: IShapeElement["shapeKind"];
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  text: string;
  html: string;
  fontSize: number;
  autoFontSize: boolean;
  textAlign: IShapeElement["textAlign"];
  bbox: IStrokeBbox | undefined;
}

// Снимает текущее состояние фигуры.
export function takeShapeSnapshot(el: IShapeElement): IShapeSnapshot {
  return {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    shapeKind: el.shapeKind,
    strokeColor: el.strokeColor,
    strokeWidth: el.strokeWidth,
    fillColor: el.fillColor,
    text: el.text,
    html: el.html,
    fontSize: el.fontSize,
    autoFontSize: el.autoFontSize,
    textAlign: el.textAlign,
    bbox: el.bbox ? { ...el.bbox } : undefined,
  };
}

// Восстанавливает состояние фигуры из снимка.
export function restoreShapeSnapshot(
  el: IShapeElement,
  snapshot: unknown,
): void {
  const snap = snapshot as IShapeSnapshot;
  el.x = snap.x;
  el.y = snap.y;
  el.width = snap.width;
  el.height = snap.height;
  el.shapeKind = snap.shapeKind;
  el.strokeColor = snap.strokeColor;
  el.strokeWidth = snap.strokeWidth;
  el.fillColor = snap.fillColor;
  el.text = snap.text;
  el.html = snap.html;
  el.fontSize = snap.fontSize;
  el.autoFontSize = snap.autoFontSize;
  el.textAlign = snap.textAlign;
  el.bbox = snap.bbox ? { ...snap.bbox } : undefined;
}

// Сдвиг фигуры на (dx, dy) от снимка. Если был bbox, тоже сдвигается.
export function applyShapeMove(
  el: IShapeElement,
  snapshot: unknown,
  dx: number,
  dy: number,
): void {
  const snap = snapshot as IShapeSnapshot;
  el.x = snap.x + dx;
  el.y = snap.y + dy;
  if (snap.bbox) {
    el.bbox = {
      minX: snap.bbox.minX + dx,
      minY: snap.bbox.minY + dy,
      maxX: snap.bbox.maxX + dx,
      maxY: snap.bbox.maxY + dy,
    };
  } else {
    el.bbox = rectBbox(el.x, el.y, el.width, el.height);
  }
}

// Resize фигуры от якорной точки. min-side кламп с anchor-preservation внутри
// applyRectResize: при упоре в минимум сторона у якоря остаётся на месте.
export function applyShapeResize(
  el: IShapeElement,
  snapshot: unknown,
  anchorX: number,
  anchorY: number,
  scaleX: number,
  scaleY: number,
): void {
  const snap = snapshot as IShapeSnapshot;
  const r = applyRectResize(
    { x: snap.x, y: snap.y, width: snap.width, height: snap.height },
    anchorX,
    anchorY,
    scaleX,
    scaleY,
    { minWidth: MIN_SHAPE_SIZE, minHeight: MIN_SHAPE_SIZE },
  );
  el.x = r.x;
  el.y = r.y;
  el.width = r.width;
  el.height = r.height;
  el.bbox = rectBbox(el.x, el.y, el.width, el.height);
}
