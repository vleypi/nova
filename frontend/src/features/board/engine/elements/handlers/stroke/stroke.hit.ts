import type { IStrokeElement } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { ERASER_TOLERANCE } from "@/features/board/constants/board.constant";
import { pointToSegmentDistSq } from "@engine/utils/math";

// Пересекаются ли два отрезка (a, b) и (c, d). Эпсилон 1e-10 для устойчивости параллельных случаев.
function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const d1x = bx - ax;
  const d1y = by - ay;
  const d2x = dx - cx;
  const d2y = dy - cy;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const t = ((cx - ax) * d2y - (cy - ay) * d2x) / cross;
  const u = ((cx - ax) * d1y - (cy - ay) * d1x) / cross;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// Hit-test штриха с допуском ERASER_TOLERANCE. Сначала bbox-проверка, затем по сегментам.
export function hitTestStroke(
  el: IStrokeElement,
  worldX: number,
  worldY: number,
  _resolver: IElementResolver,
): boolean {
  const tolerance = ERASER_TOLERANCE;
  if (el.bbox) {
    if (
      worldX < el.bbox.minX - tolerance ||
      worldX > el.bbox.maxX + tolerance ||
      worldY < el.bbox.minY - tolerance ||
      worldY > el.bbox.maxY + tolerance
    ) {
      return false;
    }
  }
  const { points, width } = el;
  const hitDistSq = (width / 2 + tolerance) ** 2;
  if (points.length === 1) {
    return (
      (worldX - points[0].x) ** 2 + (worldY - points[0].y) ** 2 <= hitDistSq
    );
  }
  for (let i = 0; i < points.length - 1; i++) {
    if (
      pointToSegmentDistSq(
        worldX,
        worldY,
        points[i].x,
        points[i].y,
        points[i + 1].x,
        points[i + 1].y,
      ) <= hitDistSq
    ) {
      return true;
    }
  }
  return false;
}

// Пересечение со прямоугольником: либо точка внутри, либо сегмент пересекает любую из 4 сторон.
export function intersectsRectStroke(
  el: IStrokeElement,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  _resolver: IElementResolver,
): boolean {
  const { points } = el;
  for (const p of points) {
    if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) return true;
  }
  for (let i = 0; i < points.length - 1; i++) {
    const ax = points[i].x;
    const ay = points[i].y;
    const bx = points[i + 1].x;
    const by = points[i + 1].y;
    if (
      segmentsIntersect(ax, ay, bx, by, minX, minY, maxX, minY) ||
      segmentsIntersect(ax, ay, bx, by, maxX, minY, maxX, maxY) ||
      segmentsIntersect(ax, ay, bx, by, maxX, maxY, minX, maxY) ||
      segmentsIntersect(ax, ay, bx, by, minX, maxY, minX, minY)
    ) {
      return true;
    }
  }
  return false;
}
