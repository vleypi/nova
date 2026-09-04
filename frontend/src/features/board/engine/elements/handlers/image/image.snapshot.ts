import type { IImageElement, IStrokeBbox } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { rectBbox } from "@engine/utils/bbox";
import { applyRectResize } from "@engine/elements/shared/resize";
import { MIN_IMAGE_SIZE } from "@/features/board/constants/board.constant";
import { computeImageVisibleRect } from "./image.draw";

// Глубокая копия картинки со смещением и новым id.
export function cloneImage(
  el: IImageElement,
  offsetX: number,
  offsetY: number,
  _resolver: IElementResolver,
): IImageElement {
  return {
    ...el,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    x: el.x + offsetX,
    y: el.y + offsetY,
    bbox: undefined,
  };
}

// Снимок состояния картинки для history-entry.
export function takeImageSnapshot(el: IImageElement): unknown {
  return {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    src: el.src,
    status: el.status,
    assetId: el.assetId,
    bbox: el.bbox ? { ...el.bbox } : undefined,
  };
}

// Накатывает снимок поверх элемента. Принимает партиал, поэтому проверяем поля.
export function restoreImageSnapshot(el: IImageElement, snapshot: unknown): void {
  const snap = snapshot as Partial<IImageElement> & { bbox?: IStrokeBbox };
  if (typeof snap.x === "number") el.x = snap.x;
  if (typeof snap.y === "number") el.y = snap.y;
  if (typeof snap.width === "number") el.width = snap.width;
  if (typeof snap.height === "number") el.height = snap.height;
  if (snap.src !== undefined) el.src = snap.src;
  if (snap.status !== undefined) el.status = snap.status;
  if (snap.assetId !== undefined) el.assetId = snap.assetId;
  el.bbox = snap.bbox ? { ...snap.bbox } : undefined;
}

// Сдвиг картинки на (dx, dy) от снимка. Если был bbox, тоже сдвигается.
export function applyImageMove(
  el: IImageElement,
  snapshot: unknown,
  dx: number,
  dy: number,
): void {
  const snap = snapshot as { x: number; y: number; bbox?: IStrokeBbox };
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

// Resize картинки от якорной точки с независимыми коэффициентами по X и Y.
// min-side кламп с anchor-preservation внутри applyRectResize.
export function applyImageResize(
  el: IImageElement,
  snapshot: unknown,
  anchorX: number,
  anchorY: number,
  scaleX: number,
  scaleY: number,
): void {
  const snap = snapshot as {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  const r = applyRectResize(
    { x: snap.x, y: snap.y, width: snap.width, height: snap.height },
    anchorX,
    anchorY,
    scaleX,
    scaleY,
    { minWidth: MIN_IMAGE_SIZE, minHeight: MIN_IMAGE_SIZE },
  );
  el.x = r.x;
  el.y = r.y;
  el.width = r.width;
  el.height = r.height;
  el.bbox = rectBbox(el.x, el.y, el.width, el.height);
}

// Bbox картинки это её видимая часть, чтобы selection-рамка не обнимала letterbox-полосы.
// Когда картинка ещё не загружена в кеш, fallback на полный слот.
export function computeImageBbox(
  el: IImageElement,
  resolver: IElementResolver,
): IStrokeBbox {
  const img = el.src ? resolver.getImageCache()?.get(el.src) : null;
  const v = computeImageVisibleRect(
    el,
    img?.naturalWidth ?? 0,
    img?.naturalHeight ?? 0,
  );
  const bbox = rectBbox(v.x, v.y, v.width, v.height);
  el.bbox = bbox;
  return bbox;
}
