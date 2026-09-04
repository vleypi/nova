import {
  IConnectorElement,
  TConnectorEndpoint,
  IElement,
  IGroupBbox,
  IPoint,
  IStrokeBbox,
} from "@engine/types";
import { hitTestElement } from "@engine/utils/hit";
import { getAnchorPoint } from "@engine/utils/anchors";
import {
  HANDLE_HIT,
  ANCHOR_PAD_PX,
  SNAP_HOVER_PAD_PX,
} from "@/features/board/constants/board.constant";
import { Camera } from "@engine/core/Camera";
import { ElementStore } from "@engine/core/ElementStore";
import { SelectionManager } from "@engine/selection/SelectionManager";

const HANDLE_HIT_SQ = HANDLE_HIT * HANDLE_HIT;

// Квадрат расстояния между двумя точками. Используется для радиус-проверок.
function distSq(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

// Точка внутри прямоугольника с padding по каждой стороне.
function pointInPaddedBbox(
  bbox: { minX: number; minY: number; maxX: number; maxY: number },
  px: number,
  py: number,
  pad: number,
): boolean {
  return (
    px >= bbox.minX - pad &&
    px <= bbox.maxX + pad &&
    py >= bbox.minY - pad &&
    py <= bbox.maxY + pad
  );
}

// Типы элементов, которые открываются в inline-редакторе по double-click.
const EDITABLE_TYPES: ReadonlySet<IElement["type"]> = new Set([
  "text",
  "sticky",
  "shape",
]);

// Ищет верхний редактируемый элемент (text/sticky/shape) под мировой точкой.
// Идёт от topmost к bottommost: верхний по z-order выигрывает независимо от типа.
// Раньше были три отдельных функции по типу, что создавало баг — текст
// «протекал» сквозь sticky/shape если те визуально перекрывали текст.
export function findEditableAt(
  store: ElementStore,
  worldX: number,
  worldY: number,
): IElement | null {
  const elements = store.getAll();
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i];
    if (
      EDITABLE_TYPES.has(element.type) &&
      hitTestElement(worldX, worldY, element, store)
    ) {
      return element;
    }
  }
  return null;
}

// Возвращает id ближайшего элемента под точкой для snap-наведения коннектора.
export function findHoverTarget(
  store: ElementStore,
  camera: Camera,
  worldX: number,
  worldY: number,
  excludeId?: string,
): string | null {
  const pad = (ANCHOR_PAD_PX + SNAP_HOVER_PAD_PX) / camera.zoom;
  const elements = store.getAll();
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i];
    if (element.id === excludeId) continue;
    if (element.type === "connector") continue;
    if (!element.bbox) continue;
    if (pointInPaddedBbox(element.bbox, worldX, worldY, pad)) {
      return element.id;
    }
  }
  return null;
}

// Возвращает единственный выделенный коннектор или null.
export function getSelectedSingleConnector(
  store: ElementStore,
  selection: SelectionManager,
): IConnectorElement | null {
  if (selection.selectedIds.size !== 1) return null;
  const [id] = [...selection.selectedIds];
  const element = store.getById(id);
  return element && element.type === "connector"
    ? (element as IConnectorElement)
    : null;
}

// Разрешает мировые координаты конца коннектора (free или привязанного).
export function resolveEndpointPos(
  store: ElementStore,
  endpoint: TConnectorEndpoint,
): IPoint | null {
  if (endpoint.kind === "free") return { x: endpoint.x, y: endpoint.y };
  const target = store.getById(endpoint.elementId);
  return target ? getAnchorPoint(target as IElement, endpoint.side) : null;
}

// Хит-тест ручек start/end выделенного коннектора в экранных координатах.
export function hitConnectorEndpoint(
  store: ElementStore,
  selection: SelectionManager,
  camera: Camera,
  screenX: number,
  screenY: number,
): {
  elementId: string;
  which: "start" | "end";
} | null {
  const connector = getSelectedSingleConnector(store, selection);
  if (!connector) return null;
  for (const which of ["start", "end"] as const) {
    const endpoint = which === "start" ? connector.start : connector.end;
    const position = resolveEndpointPos(store, endpoint);
    if (!position) continue;
    const { sx, sy } = camera.worldToScreen(position.x, position.y);
    if (distSq(screenX, screenY, sx, sy) <= HANDLE_HIT_SQ) {
      return { elementId: connector.id, which };
    }
  }
  return null;
}

// Возвращает 4 угла группового bbox в порядке TL, TR, BL, BR.
export function getCorners(groupBbox: IGroupBbox): IPoint[] {
  return [
    { x: groupBbox.x, y: groupBbox.y },
    { x: groupBbox.x + groupBbox.w, y: groupBbox.y },
    { x: groupBbox.x, y: groupBbox.y + groupBbox.h },
    { x: groupBbox.x + groupBbox.w, y: groupBbox.y + groupBbox.h },
  ];
}

// Хит-тест угловых ручек ресайза. Для одиночного коннектора отключён.
export function hitResizeCorner(
  store: ElementStore,
  selection: SelectionManager,
  groupBbox: IGroupBbox,
  screenX: number,
  screenY: number,
): number | null {
  if (getSelectedSingleConnector(store, selection)) return null;
  const corners = getCorners(groupBbox);
  for (let i = 0; i < corners.length; i++) {
    if (distSq(screenX, screenY, corners[i].x, corners[i].y) <= HANDLE_HIT_SQ) {
      return i;
    }
  }
  return null;
}

// Точка внутри группового bbox.
export function pointInGroupBbox(
  groupBbox: IGroupBbox,
  screenX: number,
  screenY: number,
): boolean {
  return (
    screenX >= groupBbox.x &&
    screenX <= groupBbox.x + groupBbox.w &&
    screenY >= groupBbox.y &&
    screenY <= groupBbox.y + groupBbox.h
  );
}

// Конвертирует экранный групповой bbox в мировой stroke-bbox.
export function screenGroupBboxToWorld(
  camera: Camera,
  groupBbox: IGroupBbox,
): IStrokeBbox {
  return {
    minX: (groupBbox.x - camera.x) / camera.zoom,
    minY: (groupBbox.y - camera.y) / camera.zoom,
    maxX: (groupBbox.x + groupBbox.w - camera.x) / camera.zoom,
    maxY: (groupBbox.y + groupBbox.h - camera.y) / camera.zoom,
  };
}

// True, если id единственный выделенный элемент.
export function isOnSelectedElement(
  selection: SelectionManager,
  id: string,
): boolean {
  return selection.selectedIds.size === 1 && selection.selectedIds.has(id);
}

// Курсор для select-инструмента в зависимости от зоны под мышью.
export function computeSelectCursor(
  store: ElementStore,
  selection: SelectionManager,
  camera: Camera,
  anchorHit: { elementId: string } | null,
  screenX: number,
  screenY: number,
): string {
  if (anchorHit && isOnSelectedElement(selection, anchorHit.elementId)) {
    return "crosshair";
  }
  if (hitConnectorEndpoint(store, selection, camera, screenX, screenY)) {
    return "grab";
  }
  const groupBbox = selection.computeGroupBbox(camera);
  if (!groupBbox) return "";
  if (getSelectedSingleConnector(store, selection)) return "";
  const corners = [
    { x: groupBbox.x, y: groupBbox.y, cursor: "nwse-resize" },
    { x: groupBbox.x + groupBbox.w, y: groupBbox.y, cursor: "nesw-resize" },
    { x: groupBbox.x, y: groupBbox.y + groupBbox.h, cursor: "nesw-resize" },
    {
      x: groupBbox.x + groupBbox.w,
      y: groupBbox.y + groupBbox.h,
      cursor: "nwse-resize",
    },
  ];
  for (const corner of corners) {
    if (distSq(screenX, screenY, corner.x, corner.y) <= HANDLE_HIT_SQ) {
      return corner.cursor;
    }
  }
  return "";
}
