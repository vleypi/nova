import type { IElement, IPoint, IStrokeBbox } from "@engine/types";

export type TAnchorSide = "top" | "right" | "bottom" | "left";

// Координаты 4 точек привязки на серединах сторон элемента.
export interface IAnchors {
  top: IPoint;
  right: IPoint;
  bottom: IPoint;
  left: IPoint;
}

// Единичные нормали наружу для каждой стороны. Используются для смещения отрисовки якорей от рамки.
export const SIDE_NORMALS: Record<TAnchorSide, IPoint> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

// Считает 4 точки привязки на серединах сторон bbox.
export function anchorsFromBbox(bbox: IStrokeBbox): IAnchors {
  const midX = (bbox.minX + bbox.maxX) / 2;
  const midY = (bbox.minY + bbox.maxY) / 2;
  return {
    top: { x: midX, y: bbox.minY },
    right: { x: bbox.maxX, y: midY },
    bottom: { x: midX, y: bbox.maxY },
    left: { x: bbox.minX, y: midY },
  };
}

// Якоря элемента или null, если у элемента ещё нет посчитанного bbox.
export function getElementAnchors(element: IElement): IAnchors | null {
  return element.bbox ? anchorsFromBbox(element.bbox) : null;
}

// Точка одного конкретного якоря или null.
export function getAnchorPoint(
  element: IElement,
  side: TAnchorSide,
): IPoint | null {
  const anchors = getElementAnchors(element);
  return anchors ? anchors[side] : null;
}
