import type { IStrokeElement, IPoint, IStrokeBbox } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { STROKE_MIN_WIDTH } from "@/features/board/constants/board.constant";
import { computeBbox } from "@engine/utils/bbox";

// Снимок состояния штриха для history-entry.
interface IStrokeSnapshot {
  points: IPoint[];
  bbox: IStrokeBbox | undefined;
  width: number;
}

// Глубокая копия штриха со смещением и новым id.
export function cloneStroke(
  el: IStrokeElement,
  offsetX: number,
  offsetY: number,
  _resolver: IElementResolver,
): IStrokeElement {
  return {
    ...el,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    points: el.points.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY })),
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

// Снимок: глубокая копия точек, bbox и ширины.
export function takeStrokeSnapshot(el: IStrokeElement): IStrokeSnapshot {
  return {
    points: el.points.map((p) => ({ ...p })),
    bbox: el.bbox ? { ...el.bbox } : undefined,
    width: el.width,
  };
}

// Накатывает снимок поверх штриха.
export function restoreStrokeSnapshot(
  el: IStrokeElement,
  snapshot: unknown,
): void {
  const snap = snapshot as IStrokeSnapshot;
  el.points = snap.points.map((p) => ({ ...p }));
  el.bbox = snap.bbox ? { ...snap.bbox } : undefined;
  el.width = snap.width;
}

// Сдвиг всех точек и bbox на (dx, dy) от снимка.
export function applyStrokeMove(
  el: IStrokeElement,
  snapshot: unknown,
  dx: number,
  dy: number,
): void {
  const snap = snapshot as IStrokeSnapshot;
  el.points = snap.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  if (snap.bbox) {
    el.bbox = {
      minX: snap.bbox.minX + dx,
      minY: snap.bbox.minY + dy,
      maxX: snap.bbox.maxX + dx,
      maxY: snap.bbox.maxY + dy,
    };
  }
}

// Resize штриха от якорной точки. Ширина линии тоже масштабируется по среднему scale.
export function applyStrokeResize(
  el: IStrokeElement,
  snapshot: unknown,
  anchorX: number,
  anchorY: number,
  scaleX: number,
  scaleY: number,
  avgScale: number,
): void {
  const snap = snapshot as IStrokeSnapshot;
  el.points = snap.points.map((p) => ({
    x: anchorX + (p.x - anchorX) * scaleX,
    y: anchorY + (p.y - anchorY) * scaleY,
  }));
  el.width = Math.max(STROKE_MIN_WIDTH, snap.width * avgScale);
  el.bbox = computeBbox(el.points, el.width);
}

// Bbox штриха через утилиту stroke-bbox. Сохраняется в el.bbox.
export function computeStrokeBbox(
  el: IStrokeElement,
  _resolver: IElementResolver,
): IStrokeBbox {
  const bbox = computeBbox(el.points, el.width);
  el.bbox = bbox;
  return bbox;
}
