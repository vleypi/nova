import type { TConnectorEndpoint, IPoint } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { getAnchorPoint, SIDE_NORMALS } from "@engine/utils/anchors";
import {
  CONNECTOR_CTRL_MIN,
  CONNECTOR_CTRL_RATIO,
} from "@/features/board/constants/board.constant";

// Endpoint после разрешения: точка в мире и нормаль наружу для anchor
// (или null для free, у которой нет привязанной стороны).
export interface IResolvedEndpoint {
  pos: IPoint;
  normal: IPoint | null;
}

// Resolver-заглушка: используется когда bbox считается без реального стора
// (например после restoreSnapshot, до помещения элемента обратно).
export const EMPTY_RESOLVER: IElementResolver = {
  getById: () => undefined,
  getImageCache: () => null,
};

// Разрешает endpoint до конкретной точки в мире.
// Для kind="anchor" ищет элемент-цель и берёт точку привязки на его стороне.
export function resolveEndpoint(
  ep: TConnectorEndpoint,
  resolver: IElementResolver,
): IResolvedEndpoint | null {
  if (ep.kind === "free") {
    return { pos: { x: ep.x, y: ep.y }, normal: null };
  }
  const target = resolver.getById(ep.elementId);
  if (!target) return null;
  const point = getAnchorPoint(target, ep.side);
  if (!point) return null;
  return { pos: point, normal: SIDE_NORMALS[ep.side] };
}

// Контрольные точки кубической Безье для curved-коннектора.
// Длина ручки контроля = max(CONNECTOR_CTRL_MIN, dist * CONNECTOR_CTRL_RATIO).
// Направление берётся от нормали якоря (если есть) или вдоль линии (для free).
export function buildControls(
  a: IResolvedEndpoint,
  b: IResolvedEndpoint,
): { c1: IPoint; c2: IPoint } {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dist = Math.hypot(dx, dy);
  const offset = Math.max(CONNECTOR_CTRL_MIN, dist * CONNECTOR_CTRL_RATIO);
  const aNorm = a.normal ?? normalize({ x: dx, y: dy });
  const bNorm = b.normal ?? normalize({ x: -dx, y: -dy });
  return {
    c1: { x: a.pos.x + aNorm.x * offset, y: a.pos.y + aNorm.y * offset },
    c2: { x: b.pos.x + bNorm.x * offset, y: b.pos.y + bNorm.y * offset },
  };
}

// Тот же buildControls, но возвращает кортеж для удобства spread в sampleCubic.
export function buildControlsAsTuple(
  a: IResolvedEndpoint,
  b: IResolvedEndpoint,
): [IPoint, IPoint] {
  const { c1, c2 } = buildControls(a, b);
  return [c1, c2];
}

// Нормализует вектор. Для нулевого возвращает (1, 0) как fallback.
function normalize(v: IPoint): IPoint {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

// Глубокая копия endpoint (для snapshot/clone).
export function cloneEndpoint(ep: TConnectorEndpoint): TConnectorEndpoint {
  return ep.kind === "free"
    ? { kind: "free", x: ep.x, y: ep.y }
    : { kind: "anchor", elementId: ep.elementId, side: ep.side };
}

// Сдвигает endpoint на (dx, dy). Anchor-endpoint не двигается (привязан к элементу).
export function translateEndpoint(
  ep: TConnectorEndpoint,
  dx: number,
  dy: number,
): TConnectorEndpoint {
  return ep.kind === "free"
    ? { kind: "free", x: ep.x + dx, y: ep.y + dy }
    : cloneEndpoint(ep);
}

// Масштабирует endpoint от якорной точки. Anchor-endpoint не трогается.
export function scaleEndpoint(
  ep: TConnectorEndpoint,
  anchorX: number,
  anchorY: number,
  scaleX: number,
  scaleY: number,
): TConnectorEndpoint {
  if (ep.kind !== "free") return cloneEndpoint(ep);
  return {
    kind: "free",
    x: anchorX + (ep.x - anchorX) * scaleX,
    y: anchorY + (ep.y - anchorY) * scaleY,
  };
}

