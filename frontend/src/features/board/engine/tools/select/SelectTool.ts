import { ITextElement } from "@engine/types";
import { getLinkAtWorldPoint } from "@engine/elements/handlers/text.handler";
import { BaseTool, IToolDeps } from "@engine/tools/BaseTool";
import { AnchorOverlay } from "@engine/anchors/AnchorOverlay";
import {
  DOUBLE_CLICK_MS,
  DOUBLE_CLICK_SLOP_PX,
} from "@/features/board/constants/board.constant";
import {
  computeSelectCursor,
  findEditableAt,
  hitConnectorEndpoint,
  hitResizeCorner,
  isOnSelectedElement,
  pointInGroupBbox,
} from "./select.hit";
import { SelectDragMove } from "./select.dragMove";
import { SelectDragResize } from "./select.dragResize";
import { SelectConnectorOps } from "./select.connector";

// Основной инструмент выделения: перемещение, ресайз, работа с коннекторами,
// двойной клик для открытия редактора текста и стикеров.
export class SelectTool extends BaseTool {
  private readonly anchorOverlay: AnchorOverlay;
  private dragMove: SelectDragMove;
  private dragResize: SelectDragResize;
  private connector: SelectConnectorOps;

  // Время последнего pointerdown для определения двойного клика.
  private lastDownTime = 0;

  // Экранные координаты последнего pointerdown.
  private lastDownPos: { x: number; y: number } | null = null;

  private boundKeydown: (e: KeyboardEvent) => void;

  constructor(deps: IToolDeps, anchorOverlay: AnchorOverlay) {
    super(deps);
    this.anchorOverlay = anchorOverlay;
    this.boundKeydown = this.onKeydown.bind(this);
    this.dragMove = new SelectDragMove(
      deps.store,
      deps.selection,
      deps.renderer,
      deps.pushHistory,
      deps.container,
    );
    this.dragResize = new SelectDragResize(
      deps.store,
      deps.selection,
      deps.renderer,
      deps.pushHistory,
      deps.camera,
    );
    this.connector = new SelectConnectorOps({
      container: deps.container,
      containerRect: deps.containerRect,
      camera: deps.camera,
      store: deps.store,
      selection: deps.selection,
      renderer: deps.renderer,
      commands: deps.commands,
      pushHistory: deps.pushHistory,
      boardId: deps.boardId,
      anchorOverlay,
    });
  }

  // Подписывается на клавиатуру и активирует коннекторные операции.
  onActivate(): void {
    document.addEventListener("keydown", this.boundKeydown);
    this.connector.activate();
  }

  // Убирает подписки и сбрасывает курсор.
  onDeactivate(): void {
    document.removeEventListener("keydown", this.boundKeydown);
    this.container.style.cursor = "";
    this.connector.deactivate();
  }

  // Обрабатывает нажатие указателя: двойной клик, коннекторы, ресайз и перемещение выделения.
  onDown(e: PointerEvent): boolean | void {
    const rect = this.containerRect.get();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.handleDoubleClick(e, screenX, screenY)) return true;

    if (this.connector.isCreating()) {
      this.connector.finalizeCreation(e);
      return true;
    }

    if (this.handleLinkOpen(e)) return true;

    if (this.handleAnchorHit(screenX, screenY)) return true;

    if (this.handleConnectorEndpoint(screenX, screenY)) return true;

    if (this.handleResizeOrMove(e, screenX, screenY)) return true;

    return false;
  }

  // Обновляет активную операцию при движении указателя.
  onMove(e: PointerEvent): void {
    if (this.connector.isEditingEndpoint()) {
      this.connector.updateEndpointEdit(e);
      return;
    }

    if (this.dragMove.isActive()) {
      this.dragMove.update(this.screenToWorld(e.clientX, e.clientY));
      return;
    }

    if (this.dragResize.isActive()) {
      this.dragResize.update(this.screenToWorld(e.clientX, e.clientY));
    }
  }

  // Завершает активную операцию при отпускании указателя.
  onUp(_e: PointerEvent): void {
    if (this.connector.isEditingEndpoint()) {
      this.connector.finalizeEndpointEdit();
      return;
    }

    if (this.dragMove.isActive()) {
      this.dragMove.end();
      return;
    }

    if (this.dragResize.isActive()) {
      this.dragResize.end();
    }
  }

  // Обновляет курсор при движении без захвата (hover).
  onHoverMove(e: PointerEvent): void {
    if (
      this.dragMove.isActive() ||
      this.dragResize.isActive() ||
      this.connector.isEditingEndpoint()
    )
      return;

    const rect = this.containerRect.get();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (this.connector.isCreating()) {
      this.connector.updateCreationPreview(e.clientX, e.clientY, screenX, screenY);
      this.container.style.cursor = "crosshair";
      return;
    }

    const anchorHit = this.anchorOverlay.hitAnchor(screenX, screenY);
    this.container.style.cursor = computeSelectCursor(
      this.store,
      this.selection,
      this.camera,
      anchorHit,
      screenX,
      screenY,
    );
  }

  // Проверяет двойной клик и открывает редактор текста или стикера.
  // Возвращает true, если двойной клик обработан.
  private handleDoubleClick(e: PointerEvent, screenX: number, screenY: number): boolean {
    const now = Date.now();
    const previous = this.lastDownPos;
    const isDoubleClick =
      now - this.lastDownTime < DOUBLE_CLICK_MS &&
      previous !== null &&
      (screenX - previous.x) ** 2 + (screenY - previous.y) ** 2 <
        DOUBLE_CLICK_SLOP_PX * DOUBLE_CLICK_SLOP_PX;

    this.lastDownTime = now;
    this.lastDownPos = { x: screenX, y: screenY };

    if (!isDoubleClick) return false;

    const worldPoint = this.screenToWorld(e.clientX, e.clientY);
    const editable = findEditableAt(this.store, worldPoint.x, worldPoint.y);
    if (editable) {
      this.connector.cancelCreation();
      this.openEdit(editable);
      this.lastDownTime = 0;
      this.lastDownPos = null;
      return true;
    }
    return false;
  }

  // При зажатом Ctrl/Meta открывает ссылку из текстового элемента в браузере.
  // Возвращает true, если ссылка найдена и открыта.
  private handleLinkOpen(e: PointerEvent): boolean {
    if (!e.ctrlKey && !e.metaKey) return false;

    const worldPoint = this.screenToWorld(e.clientX, e.clientY);
    const allElements = this.store.getAll();
    for (let i = allElements.length - 1; i >= 0; i--) {
      const element = allElements[i];
      if (element.type === "text") {
        const url = getLinkAtWorldPoint(
          element as ITextElement,
          worldPoint.x,
          worldPoint.y,
        );
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
          return true;
        }
      }
    }
    return false;
  }

  // Проверяет попадание в якорь якорного оверлея и запускает создание коннектора.
  // Возвращает true, если якорь найден.
  private handleAnchorHit(screenX: number, screenY: number): boolean {
    const anchorHit = this.anchorOverlay.hitAnchor(screenX, screenY);
    if (anchorHit && isOnSelectedElement(this.selection, anchorHit.elementId)) {
      this.connector.startCreation(anchorHit);
      return true;
    }
    return false;
  }

  // Проверяет попадание в конечную точку коннектора и начинает её редактирование.
  // Возвращает true, если редактирование начато.
  private handleConnectorEndpoint(screenX: number, screenY: number): boolean {
    const endpointHit = hitConnectorEndpoint(
      this.store,
      this.selection,
      this.camera,
      screenX,
      screenY,
    );
    if (endpointHit) {
      return this.connector.beginEndpointEdit(endpointHit);
    }
    return false;
  }

  // Проверяет попадание в угловой маркер ресайза или в bbox группы,
  // запускает ресайз или перемещение соответственно.
  private handleResizeOrMove(e: PointerEvent, screenX: number, screenY: number): boolean {
    const groupBbox = this.selection.computeGroupBbox(this.camera);
    if (!groupBbox) return false;

    const cornerIndex = hitResizeCorner(this.store, this.selection, groupBbox, screenX, screenY);
    if (cornerIndex !== null) {
      this.dragResize.begin(cornerIndex, groupBbox);
      return true;
    }

    if (pointInGroupBbox(groupBbox, screenX, screenY)) {
      this.dragMove.begin(this.screenToWorld(e.clientX, e.clientY));
      return true;
    }

    return false;
  }

  // Обрабатывает Escape для отмены создания коннектора.
  private onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape" && this.connector.isCreating()) {
      e.preventDefault();
      e.stopPropagation();
      this.connector.cancelCreation();
    }
  }
}
