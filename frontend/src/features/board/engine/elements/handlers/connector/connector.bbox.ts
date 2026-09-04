import type { IConnectorElement, IStrokeBbox } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { sampleCubic } from "@engine/utils/bezier";
import { CONNECTOR_BBOX_STEPS } from "@/features/board/constants/board.constant";
import { buildControlsAsTuple, resolveEndpoint } from "./connector.geom";

// Считает мировой bbox коннектора. Для curved-варианта сэмплирует Безье,
// для прямой берёт два конца. Если endpoint не разрешился, возвращает старый bbox.
export function computeConnectorBbox(
  el: IConnectorElement,
  resolver: IElementResolver,
): IStrokeBbox {
  const a = resolveEndpoint(el.start, resolver);
  const b = resolveEndpoint(el.end, resolver);
  if (!a || !b) return el.bbox ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 };

  const samples = el.curved
    ? sampleCubic(
        a.pos,
        ...buildControlsAsTuple(a, b),
        b.pos,
        CONNECTOR_BBOX_STEPS,
      )
    : [a.pos, b.pos];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of samples) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const pad = el.strokeWidth / 2;
  const bbox = {
    minX: minX - pad,
    minY: minY - pad,
    maxX: maxX + pad,
    maxY: maxY + pad,
  };
  el.bbox = bbox;
  return bbox;
}
