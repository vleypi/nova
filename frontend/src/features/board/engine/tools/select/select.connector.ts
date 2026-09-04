import {
  IConnectorElement,
  TConnectorEndpoint,
  IPoint,
  THistoryEntry,
} from "@engine/types";
import { getHandler } from "@engine/elements/element-registry";
import {
  ANCHOR_FILL,
  ANCHOR_LINE_WIDTH,
  ANCHOR_STROKE,
  CONNECTOR_PREVIEW_ALPHA,
  CONNECTOR_PREVIEW_ID,
  DEFAULT_CONNECTOR_COLOR,
  DEFAULT_CONNECTOR_WIDTH,
  HANDLE_RADIUS,
} from "@/features/board/constants/board.constant";
import {
  AnchorOverlay,
  IAnchorHit,
  TAnchorMode,
} from "@engine/anchors/AnchorOverlay";
import { Camera } from "@engine/core/Camera";
import { Commands } from "@engine/core/Commands";
import { ContainerRect } from "@engine/core/ContainerRect";
import { ElementStore } from "@engine/core/ElementStore";
import { SelectionManager } from "@engine/selection/SelectionManager";
import { BoardRenderer } from "@engine/renderer/BoardRenderer";
import {
  findHoverTarget,
  getSelectedSingleConnector,
  resolveEndpointPos,
} from "./select.hit";

// Зависимости SelectConnectorOps в виде объекта (вместо 8 позиционных параметров).
export interface ISelectConnectorOpsDeps {
  container: HTMLDivElement;
  containerRect: ContainerRect;
  camera: Camera;
  store: ElementStore;
  selection: SelectionManager;
  renderer: BoardRenderer;
  commands: Commands;
  pushHistory: (entry: THistoryEntry) => void;
  boardId: string;
  anchorOverlay: AnchorOverlay;
}

// Операции создания коннектора через якоря и редактирования его конечных точек.
export class SelectConnectorOps {
  private editingConnectorId: string | null = null;
  private editingWhich: "start" | "end" | null = null;
  private editingOrigSnapshot: unknown = null;
  private editingPrevMode: TAnchorMode = "selectOnly";

  private creatingFrom: TConnectorEndpoint | null = null;
  private creatingPreviewEnd: IPoint | null = null;
  private creatingSnap: IAnchorHit | null = null;
  private creatingPrevMode: TAnchorMode = "selectOnly";

  private disposeEndpointDrawer: (() => void) | null = null;
  private disposePreviewDrawer: (() => void) | null = null;

  private container: HTMLDivElement;
  private containerRect: ContainerRect;
  private camera: Camera;
  private store: ElementStore;
  private selection: SelectionManager;
  private renderer: BoardRenderer;
  private commands: Commands;
  private pushHistory: (entry: THistoryEntry) => void;
  private boardId: string;
  private anchorOverlay: AnchorOverlay;

  constructor(deps: ISelectConnectorOpsDeps) {
    this.container = deps.container;
    this.containerRect = deps.containerRect;
    this.camera = deps.camera;
    this.store = deps.store;
    this.selection = deps.selection;
    this.renderer = deps.renderer;
    this.commands = deps.commands;
    this.pushHistory = deps.pushHistory;
    this.boardId = deps.boardId;
    this.anchorOverlay = deps.anchorOverlay;
  }

  // Регистрирует drawers в renderer. Вызывается при активации инструмента выделения.
  activate(): void {
    this.disposeEndpointDrawer = this.renderer.addScreenDrawer((ctx, cam) =>
      this.drawConnectorEndpointHandles(ctx, cam),
    );
    this.disposePreviewDrawer = this.renderer.addWorldDrawer((ctx) =>
      this.drawCreationPreview(ctx),
    );
  }

  // Отписывает drawers и сбрасывает состояние создания.
  deactivate(): void {
    this.disposeEndpointDrawer?.();
    this.disposeEndpointDrawer = null;
    this.disposePreviewDrawer?.();
    this.disposePreviewDrawer = null;
    this.cancelCreation();
  }

  // Возвращает true, если сейчас идёт процесс создания нового коннектора.
  isCreating(): boolean {
    return this.creatingFrom !== null;
  }

  // Возвращает true, если сейчас редактируется конечная точка существующего коннектора.
  isEditingEndpoint(): boolean {
    return this.editingConnectorId !== null;
  }

  // Начинает редактирование конечной точки коннектора. Возвращает false, если элемент не найден.
  beginEndpointEdit(endpointHit: {
    elementId: string;
    which: "start" | "end";
  }): boolean {
    const connector = this.store.getById(endpointHit.elementId) as
      | IConnectorElement
      | undefined;
    if (connector) {
      this.editingConnectorId = endpointHit.elementId;
      this.editingWhich = endpointHit.which;
      this.editingOrigSnapshot = getHandler("connector").takeSnapshot(connector);
      this.editingPrevMode = this.anchorOverlay.getMode();
      this.anchorOverlay.setMode("selectAndHover");
      return true;
    }
    return false;
  }

  // Обновляет позицию редактируемой конечной точки по текущей позиции указателя.
  updateEndpointEdit(event: PointerEvent): void {
    if (!this.editingConnectorId || !this.editingWhich) return;
    const connector = this.store.getById(this.editingConnectorId) as
      | IConnectorElement
      | undefined;
    if (!connector) return;

    const worldPoint = this.screenToWorld(event.clientX, event.clientY);
    const rect = this.containerRect.get();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const hovered = findHoverTarget(
      this.store,
      this.camera,
      worldPoint.x,
      worldPoint.y,
      connector.id,
    );
    this.anchorOverlay.setHoveredElement(hovered);

    const snap: IAnchorHit | null = this.anchorOverlay.hitAnchor(screenX, screenY);
    const newEndpoint: TConnectorEndpoint =
      snap && !this.isSelfLoop(connector, snap)
        ? { kind: "anchor", elementId: snap.elementId, side: snap.side }
        : { kind: "free", x: worldPoint.x, y: worldPoint.y };

    if (this.editingWhich === "start") connector.start = newEndpoint;
    else connector.end = newEndpoint;

    this.reindexAndRender(connector);
  }

  // Фиксирует изменение конечной точки, пишет запись в историю.
  finalizeEndpointEdit(): void {
    const connectorId = this.editingConnectorId;
    if (connectorId) {
      this.tryPushEndpointEditHistory(connectorId);
    }
    this.editingConnectorId = null;
    this.editingWhich = null;
    this.editingOrigSnapshot = null;
    this.anchorOverlay.setHoveredElement(null);
    this.anchorOverlay.setMode(this.editingPrevMode);
    this.renderer.renderFrame();
  }

  // Начинает создание нового коннектора из указанного якоря.
  startCreation(hit: IAnchorHit): void {
    this.creatingFrom = {
      kind: "anchor",
      elementId: hit.elementId,
      side: hit.side,
    };
    this.creatingPreviewEnd = { ...hit.pos };
    this.creatingSnap = null;
    this.creatingPrevMode = this.anchorOverlay.getMode();
    this.anchorOverlay.setMode("selectAndHover");
    this.container.style.cursor = "crosshair";
    this.renderer.scheduleRender();
  }

  // Обновляет превью создаваемого коннектора при движении указателя.
  updateCreationPreview(
    clientX: number,
    clientY: number,
    mouseScreenX: number,
    mouseScreenY: number,
  ): void {
    if (!this.creatingFrom) return;

    const worldPoint = this.screenToWorld(clientX, clientY);
    const startElementId =
      this.creatingFrom.kind === "anchor" ? this.creatingFrom.elementId : null;

    const hovered = findHoverTarget(
      this.store,
      this.camera,
      worldPoint.x,
      worldPoint.y,
      startElementId ?? undefined,
    );
    this.anchorOverlay.setHoveredElement(hovered);

    const snap = this.anchorOverlay.hitAnchor(mouseScreenX, mouseScreenY);
    const isSameAsStart = this.snapIsSameAsStart(snap);

    if (snap && !isSameAsStart) {
      this.creatingSnap = snap;
      this.creatingPreviewEnd = { ...snap.pos };
    } else {
      this.creatingSnap = null;
      this.creatingPreviewEnd = worldPoint;
    }
    this.renderer.scheduleRender();
  }

  // Завершает создание коннектора. Если нет snap-цели, отменяет.
  finalizeCreation(_event: PointerEvent): void {
    if (!this.creatingFrom || !this.creatingSnap) {
      this.cancelCreation();
      return;
    }
    const endEndpoint: TConnectorEndpoint = {
      kind: "anchor",
      elementId: this.creatingSnap.elementId,
      side: this.creatingSnap.side,
    };
    if (this.isSelfLoopEndpoints(this.creatingFrom, endEndpoint)) {
      this.cancelCreation();
      return;
    }
    const newElement = this.buildConnectorElement(this.creatingFrom, endEndpoint);
    getHandler("connector").computeBbox(newElement, this.store);
    this.commands.createElement(newElement);
    this.selection.clearAll();
    this.selection.add(newElement.id);
    this.cancelCreation(false);
    this.anchorOverlay.setMode(this.creatingPrevMode);
  }

  // Отменяет создание коннектора, сбрасывает состояние и курсор.
  cancelCreation(restoreMode: boolean = true): void {
    const wasActive = !!this.creatingFrom;
    this.creatingFrom = null;
    this.creatingPreviewEnd = null;
    this.creatingSnap = null;
    if (wasActive) {
      this.anchorOverlay.setHoveredElement(null);
      if (restoreMode) this.anchorOverlay.setMode(this.creatingPrevMode);
      this.container.style.cursor = "";
      this.renderer.scheduleRender();
    }
  }

  // ----- private helpers -----

  // True если snap указывает на тот же элемент, что и противоположный конец редактируемого коннектора.
  private isSelfLoop(connector: IConnectorElement, snap: IAnchorHit): boolean {
    const oppositeEndpoint = this.editingWhich === "start" ? connector.end : connector.start;
    return (
      oppositeEndpoint.kind === "anchor" &&
      oppositeEndpoint.elementId === snap.elementId
    );
  }

  // True если оба конца создаваемого коннектора привязаны к одному элементу.
  private isSelfLoopEndpoints(
    start: TConnectorEndpoint,
    end: TConnectorEndpoint,
  ): boolean {
    return (
      start.kind === "anchor" &&
      end.kind === "anchor" &&
      start.elementId === end.elementId
    );
  }

  // True если snap совпадает с якорем-источником создаваемого коннектора.
  private snapIsSameAsStart(snap: IAnchorHit | null): boolean {
    return (
      !!snap &&
      this.creatingFrom !== null &&
      this.creatingFrom.kind === "anchor" &&
      snap.elementId === this.creatingFrom.elementId &&
      snap.side === this.creatingFrom.side
    );
  }

  // Строит объект IConnectorElement с дефолтными параметрами.
  private buildConnectorElement(
    start: TConnectorEndpoint,
    end: TConnectorEndpoint,
    id: string = crypto.randomUUID(),
  ): IConnectorElement {
    return {
      id,
      type: "connector",
      boardId: this.boardId,
      userId: "",
      createdAt: Date.now(),
      start,
      end,
      strokeColor: DEFAULT_CONNECTOR_COLOR,
      strokeWidth: DEFAULT_CONNECTOR_WIDTH,
      startArrow: "none",
      endArrow: "arrow",
      curved: true,
    };
  }

  // Строит конечную точку для превью: snap-якорь или свободная мировая точка.
  private buildPreviewEndEndpoint(): TConnectorEndpoint | null {
    if (!this.creatingPreviewEnd) return null;
    if (this.creatingSnap) {
      return {
        kind: "anchor",
        elementId: this.creatingSnap.elementId,
        side: this.creatingSnap.side,
      };
    }
    return {
      kind: "free",
      x: this.creatingPreviewEnd.x,
      y: this.creatingPreviewEnd.y,
    };
  }

  // Пересчитывает bbox и перерисовывает кадр для изменённого коннектора.
  private reindexAndRender(connector: IConnectorElement): void {
    getHandler("connector").computeBbox(connector, this.store);
    this.store.reindex(connector.id);
    this.renderer.rebuildBuffer();
    this.renderer.renderFrame();
  }

  // Сохраняет запись истории для завершённого редактирования конечной точки.
  private tryPushEndpointEditHistory(connectorId: string): void {
    const element = this.store.getById(connectorId);
    if (element && element.type === "connector" && this.editingOrigSnapshot) {
      const newSnapshot = getHandler("connector").takeSnapshot(element);
      this.pushHistory({
        type: "edit",
        changes: [
          {
            id: connectorId,
            oldData: this.editingOrigSnapshot,
            newData: newSnapshot,
          },
        ],
      });
    }
  }

  // Рисует круглые маркеры на конечных точках выбранного коннектора.
  private drawConnectorEndpointHandles(
    ctx: CanvasRenderingContext2D,
    cam: {
      worldToScreen: (x: number, y: number) => { sx: number; sy: number };
    },
  ): void {
    const selectedConnector = getSelectedSingleConnector(this.store, this.selection);
    if (!selectedConnector) return;

    ctx.fillStyle = ANCHOR_FILL;
    ctx.strokeStyle = ANCHOR_STROKE;
    ctx.lineWidth = ANCHOR_LINE_WIDTH;

    for (const endpoint of [selectedConnector.start, selectedConnector.end]) {
      const position = resolveEndpointPos(this.store, endpoint);
      if (!position) continue;
      const { sx, sy } = cam.worldToScreen(position.x, position.y);
      ctx.beginPath();
      ctx.arc(sx, sy, HANDLE_RADIUS + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Рисует полупрозрачный превью-коннектор во время создания.
  private drawCreationPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.creatingFrom) return;
    const endEndpoint = this.buildPreviewEndEndpoint();
    if (!endEndpoint) return;

    const previewElement = this.buildConnectorElement(
      this.creatingFrom,
      endEndpoint,
      CONNECTOR_PREVIEW_ID,
    );
    previewElement.createdAt = 0;

    ctx.save();
    ctx.globalAlpha = CONNECTOR_PREVIEW_ALPHA;
    getHandler("connector").draw(ctx, previewElement, this.store);
    ctx.restore();
  }

  // Переводит экранные координаты события в мировые координаты доски.
  private screenToWorld(clientX: number, clientY: number): IPoint {
    const rect = this.containerRect.get();
    const { wx, wy } = this.camera.screenToWorld(
      clientX - rect.left,
      clientY - rect.top,
    );
    return { x: wx, y: wy };
  }
}
