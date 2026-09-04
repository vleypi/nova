import type { IElement } from "@engine/types";
import { getHandler } from "@engine/elements/element-registry";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";

// Проверяет попадание мировой точки в элемент через его handler.
export function hitTestElement(
  worldX: number,
  worldY: number,
  element: IElement,
  resolver: IElementResolver,
): boolean {
  return getHandler(element.type).hitTest(element, worldX, worldY, resolver);
}

// Проверяет пересечение элемента с прямоугольником в мировых координатах через его handler.
export function strokeIntersectsRect(
  element: IElement,
  wMinX: number,
  wMinY: number,
  wMaxX: number,
  wMaxY: number,
  resolver: IElementResolver,
): boolean {
  return getHandler(element.type).intersectsRect(
    element,
    wMinX,
    wMinY,
    wMaxX,
    wMaxY,
    resolver,
  );
}
