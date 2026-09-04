import type { ITextElement } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";

// Hit-test текста: попадание в его bbox. Без bbox считаем что нет попадания.
export function hitTestText(
  el: ITextElement,
  worldX: number,
  worldY: number,
  _resolver: IElementResolver,
): boolean {
  if (!el.bbox) return false;
  return (
    worldX >= el.bbox.minX &&
    worldX <= el.bbox.maxX &&
    worldY >= el.bbox.minY &&
    worldY <= el.bbox.maxY
  );
}

// Пересечение bbox текста с прямоугольником. Без bbox считаем что нет пересечения.
export function intersectsRectText(
  el: ITextElement,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  _resolver: IElementResolver,
): boolean {
  if (!el.bbox) return false;
  return (
    el.bbox.maxX >= minX &&
    el.bbox.minX <= maxX &&
    el.bbox.maxY >= minY &&
    el.bbox.minY <= maxY
  );
}
