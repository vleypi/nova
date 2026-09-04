import type {
  IConnectorElement,
  TConnectorEndpoint,
  IPoint,
  IStrokeBbox,
  TArrowEnd,
} from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { CONNECTOR_MIN_STROKE_WIDTH } from "@/features/board/constants/board.constant";
import {
  cloneEndpoint,
  resolveEndpoint,
  scaleEndpoint,
  translateEndpoint,
  EMPTY_RESOLVER,
  IResolvedEndpoint,
} from "./connector.geom";
import { computeConnectorBbox } from "./connector.bbox";

// Снимок состояния коннектора для history-entry. Endpoints клонируются глубоко.
export interface IConnectorSnapshot {
  start: TConnectorEndpoint;
  end: TConnectorEndpoint;
  strokeColor: string;
  strokeWidth: number;
  startArrow: TArrowEnd;
  endArrow: TArrowEnd;
  curved: boolean;
  label: string | undefined;
  bbox: IStrokeBbox | undefined;
}

// Снимает текущее состояние коннектора в IConnectorSnapshot.
export function takeConnectorSnapshot(
  el: IConnectorElement,
): IConnectorSnapshot {
  return {
    start: cloneEndpoint(el.start),
    end: cloneEndpoint(el.end),
    strokeColor: el.strokeColor,
    strokeWidth: el.strokeWidth,
    startArrow: el.startArrow,
    endArrow: el.endArrow,
    curved: el.curved,
    label: el.label,
    bbox: el.bbox ? { ...el.bbox } : undefined,
  };
}

// Восстанавливает состояние коннектора из снимка (для undo/redo).
export function restoreConnectorSnapshot(
  el: IConnectorElement,
  snapshot: unknown,
): void {
  const snap = snapshot as IConnectorSnapshot;
  el.start = cloneEndpoint(snap.start);
  el.end = cloneEndpoint(snap.end);
  el.strokeColor = snap.strokeColor;
  el.strokeWidth = snap.strokeWidth;
  el.startArrow = snap.startArrow;
  el.endArrow = snap.endArrow;
  el.curved = snap.curved;
  el.label = snap.label;
  el.bbox = snap.bbox ? { ...snap.bbox } : undefined;
}

// Сдвигает оба endpoint и bbox на (dx, dy). Anchor-endpoint остаётся привязан к элементу.
export function applyConnectorMove(
  el: IConnectorElement,
  snapshot: unknown,
  dx: number,
  dy: number,
): void {
  const snap = snapshot as IConnectorSnapshot;
  el.start = translateEndpoint(snap.start, dx, dy);
  el.end = translateEndpoint(snap.end, dx, dy);
  if (snap.bbox) {
    el.bbox = {
      minX: snap.bbox.minX + dx,
      minY: snap.bbox.minY + dy,
      maxX: snap.bbox.maxX + dx,
      maxY: snap.bbox.maxY + dy,
    };
  }
}

// Масштабирует endpoints от якорной точки и пересчитывает bbox.
// strokeWidth тоже масштабируется на avgScale, но не меньше CONNECTOR_MIN_STROKE_WIDTH.
export function applyConnectorResize(
  el: IConnectorElement,
  snapshot: unknown,
  anchorX: number,
  anchorY: number,
  scaleX: number,
  scaleY: number,
  avgScale: number,
): void {
  const snap = snapshot as IConnectorSnapshot;
  el.start = scaleEndpoint(snap.start, anchorX, anchorY, scaleX, scaleY);
  el.end = scaleEndpoint(snap.end, anchorX, anchorY, scaleX, scaleY);
  el.strokeWidth = Math.max(
    CONNECTOR_MIN_STROKE_WIDTH,
    snap.strokeWidth * avgScale,
  );
  computeConnectorBbox(el, EMPTY_RESOLVER);
}

// Копирует коннектор со сдвигом. Anchor-endpoints превращаются в free
// в текущих мировых координатах (плюс offset), чтобы клон не остался привязан
// к тому же элементу.
export function cloneConnector(
  el: IConnectorElement,
  offsetX: number,
  offsetY: number,
  resolver: IElementResolver,
): IConnectorElement {
  const a = resolveEndpoint(el.start, resolver);
  const b = resolveEndpoint(el.end, resolver);
  const freeFrom = (
    resolved: IResolvedEndpoint | null,
    fallback: IPoint,
  ): TConnectorEndpoint => ({
    kind: "free",
    x: (resolved?.pos.x ?? fallback.x) + offsetX,
    y: (resolved?.pos.y ?? fallback.y) + offsetY,
  });
  return {
    ...el,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    start: freeFrom(a, { x: 0, y: 0 }),
    end: freeFrom(b, { x: 0, y: 0 }),
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
