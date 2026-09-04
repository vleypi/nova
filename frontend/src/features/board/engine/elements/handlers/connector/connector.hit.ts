import type { IConnectorElement } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { sampleCubic, minSqDistToSamples } from "@engine/utils/bezier";
import { pointToSegmentDistSq } from "@engine/utils/math";
import {
  CONNECTOR_BBOX_STEPS,
  CONNECTOR_HIT_STEPS,
  CONNECTOR_HIT_TOLERANCE,
} from "@/features/board/constants/board.constant";
import {
  buildControls,
  buildControlsAsTuple,
  resolveEndpoint,
} from "./connector.geom";

// Hit-test коннектора с допуском CONNECTOR_HIT_TOLERANCE плюс пол-ширины линии.
// Прямой - точка-к-отрезку. Curved - сэмплируем Безье и берём минимальное расстояние.
export function hitTestConnector(
  el: IConnectorElement,
  worldX: number,
  worldY: number,
  resolver: IElementResolver,
): boolean {
  const a = resolveEndpoint(el.start, resolver);
  const b = resolveEndpoint(el.end, resolver);
  if (!a || !b) return false;

  const tolerance = CONNECTOR_HIT_TOLERANCE + el.strokeWidth / 2;
  const toleranceSq = tolerance * tolerance;

  if (!el.curved) {
    return (
      pointToSegmentDistSq(worldX, worldY, a.pos.x, a.pos.y, b.pos.x, b.pos.y) <=
      toleranceSq
    );
  }
  const { c1, c2 } = buildControls(a, b);
  const samples = sampleCubic(a.pos, c1, c2, b.pos, CONNECTOR_HIT_STEPS);
  return minSqDistToSamples(samples, worldX, worldY) <= toleranceSq;
}

// Пересечение коннектора с прямоугольником: грубая аппроксимация через попадание
// любой из сэмплированных точек кривой/отрезка внутрь rect.
export function intersectsRectConnector(
  el: IConnectorElement,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  resolver: IElementResolver,
): boolean {
  const a = resolveEndpoint(el.start, resolver);
  const b = resolveEndpoint(el.end, resolver);
  if (!a || !b) return false;

  const samples = el.curved
    ? sampleCubic(
        a.pos,
        ...buildControlsAsTuple(a, b),
        b.pos,
        CONNECTOR_BBOX_STEPS,
      )
    : [a.pos, b.pos];
  for (const p of samples) {
    if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) return true;
  }
  return false;
}
