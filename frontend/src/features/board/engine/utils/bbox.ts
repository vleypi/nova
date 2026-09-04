import type { IPoint, IStrokeBbox } from "@engine/types";

// Bbox для прямоугольника (x, y, ширина, высота).
export function rectBbox(
  x: number,
  y: number,
  w: number,
  h: number,
): IStrokeBbox {
  return { minX: x, minY: y, maxX: x + w, maxY: y + h };
}

// Точка (px, py) внутри прямоугольника (x, y, w, h).
export function rectContains(
  x: number,
  y: number,
  w: number,
  h: number,
  px: number,
  py: number,
): boolean {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

// Пересекается ли прямоугольник (x, y, w, h) с прямоугольником-запросом (qMinX..qMaxY).
export function rectIntersects(
  x: number,
  y: number,
  w: number,
  h: number,
  qMinX: number,
  qMinY: number,
  qMaxX: number,
  qMaxY: number,
): boolean {
  return !(x > qMaxX || x + w < qMinX || y > qMaxY || y + h < qMinY);
}

// Считает bbox набора точек с учётом ширины линии (расширяет на width/2 во все стороны).
// Используется для штрихов карандаша; математика generic — подойдёт любой polyline-форме.
export function computeBbox(points: IPoint[], width: number): IStrokeBbox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  const pad = width / 2;
  return {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
}
