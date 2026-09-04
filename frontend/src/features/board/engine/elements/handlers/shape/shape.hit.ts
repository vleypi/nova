import type { IShapeElement } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { rectContains, rectIntersects } from "@engine/utils/bbox";

// Hit-test по всей внутренней площади (даже без fill, иначе незакрашенную фигуру
// нельзя схватить за центр). Switch по shapeKind для не-rect форм.
export function hitTestShape(
  el: IShapeElement,
  worldX: number,
  worldY: number,
  _resolver: IElementResolver,
): boolean {
  if (!rectContains(el.x, el.y, el.width, el.height, worldX, worldY)) {
    return false;
  }
  switch (el.shapeKind) {
    case "rect":
      return true;
    case "ellipse":
      return isInsideEllipse(el, worldX, worldY);
    case "diamond":
      return isInsideDiamond(el, worldX, worldY);
    case "triangle":
      return isInsideTriangle(el, worldX, worldY);
  }
}

// Пересечение bbox с rect-запросом. Не pixel-perfect, но консистентно с image.
export function intersectsRectShape(
  el: IShapeElement,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  _resolver: IElementResolver,
): boolean {
  return rectIntersects(el.x, el.y, el.width, el.height, minX, minY, maxX, maxY);
}

// Точка внутри эллипса: ((wx-cx)/rx)^2 + ((wy-cy)/ry)^2 <= 1
function isInsideEllipse(
  el: IShapeElement,
  wx: number,
  wy: number,
): boolean {
  const rx = el.width / 2;
  const ry = el.height / 2;
  if (rx <= 0 || ry <= 0) return false;
  const cx = el.x + rx;
  const cy = el.y + ry;
  const nx = (wx - cx) / rx;
  const ny = (wy - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

// Точка внутри ромба: |wx-cx|/rx + |wy-cy|/ry <= 1
function isInsideDiamond(
  el: IShapeElement,
  wx: number,
  wy: number,
): boolean {
  const rx = el.width / 2;
  const ry = el.height / 2;
  if (rx <= 0 || ry <= 0) return false;
  const cx = el.x + rx;
  const cy = el.y + ry;
  return Math.abs(wx - cx) / rx + Math.abs(wy - cy) / ry <= 1;
}

// Точка внутри треугольника (apex top-center, база на нижнем ребре).
// Используем sign-of-cross-product: точка внутри если знаки 3 cross совпадают.
function isInsideTriangle(
  el: IShapeElement,
  wx: number,
  wy: number,
): boolean {
  const ax = el.x + el.width / 2;
  const ay = el.y;
  const bx = el.x + el.width;
  const by = el.y + el.height;
  const cx = el.x;
  const cy = el.y + el.height;
  const d1 = sign(wx, wy, ax, ay, bx, by);
  const d2 = sign(wx, wy, bx, by, cx, cy);
  const d3 = sign(wx, wy, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

// Знак cross-product (px-bx, py-by) и (ax-bx, ay-by). Используется в point-in-triangle.
function sign(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}
