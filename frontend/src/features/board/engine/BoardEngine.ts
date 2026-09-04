import "@engine/elements/register-handlers";

import {
  IElement,
  ISelectionBox,
  IWsCursorUpdated,
  IWsOnlineUser,
  TPenTool,
  TShapeKind,
  TTool,
} from "@engine/types";
import { TConnectionStatus } from "@engine/types/ui.types";

import { Camera } from "@engine/core/Camera";
import { CameraPersistence } from "@engine/core/CameraPersistence";
import { Commands } from "@engine/core/Commands";
import { ContainerRect } from "@engine/core/ContainerRect";
import { ElementStore } from "@engine/core/ElementStore";
import { EventBus } from "@engine/core/EventBus";
import { SelectionManager } from "@engine/selection/SelectionManager";
import { BoardRenderer } from "@engine/renderer/BoardRenderer";
import { GridRenderer } from "@engine/renderer/GridRenderer";
import { WheelZoom } from "@engine/viewport/WheelZoom";
import { PointerPan } from "@engine/viewport/PointerPan";
import { CursorEmitter } from "@engine/viewport/CursorEmitter";
import { ZoomController } from "@engine/viewport/ZoomController";
import { SelectionBox } from "@engine/selection/SelectionBox";
import { BaseTool } from "@engine/tools/BaseTool";
import { ToolManager } from "@engine/tools/ToolManager";
import { PencilTool } from "@engine/tools/PencilTool";
import { EraserTool } from "@engine/tools/EraserTool";
import { SelectTool } from "@engine/tools/select/SelectTool";
import { TextTool } from "@engine/tools/TextTool";
import { StickyTool } from "@engine/tools/StickyTool";
import { ShapeTool } from "@engine/tools/ShapeTool";
import { BoardSync } from "@engine/sync/BoardSync";
import { KeyboardHandler } from "@engine/keyboard/KeyboardHandler";
import { AnchorOverlay } from "@engine/anchors/AnchorOverlay";
import { InputRouter } from "@engine/input/InputRouter";
import { ImageCache } from "@engine/image/ImageCache";
import { initHandlersForStore } from "@engine/elements/element-registry";
import { ImageUploader } from "@engine/image/ImageUploader";
import { PasteHandler } from "@engine/image/PasteHandler";
import { EditingController } from "@engine/editor/EditingController";
import { generateSlotLabel, snapshotElementForAi } from "@engine/utils/slot-label.util";
import { MAX_SLOT_ELEMENTS } from "@/features/board/constants/board.constant";

interface IArmedColorTool {
  setArmedColor(color: string): void;
}

function hasSetArmedColor(tool: BaseTool): tool is BaseTool & IArmedColorTool {
  return typeof (tool as Partial<IArmedColorTool>).setArmedColor === "function";
}

interface IShapeKindArmedTool {
  setArmedShapeKind(kind: TShapeKind): void;
}

function hasSetArmedShapeKind(
  tool: BaseTool,
): tool is BaseTool & IShapeKindArmedTool {
  return (
    typeof (tool as Partial<IShapeKindArmedTool>).setArmedShapeKind ===
    "function"
  );
}

export interface IBoardEngineEvents {
  activeToolChange: TTool;
  selectionBoxChange: ISelectionBox | null;
  usersChange: IWsOnlineUser[];
  userLeft: string;
  cursorUpdated: IWsCursorUpdated;
  cursorRemoved: string;
  zoomChange: number;
  connectionStatus: TConnectionStatus;
  boardError: string;
  boardReady: void;
  toast: string;
  aiElementProgress: {
    txId: string;
    created: number;
    updated: number;
    moved: number;
    deleted: number;
    step: number;
  };
  aiTransactionDone: {
    txId: string;
    ok: boolean;
    summary: { created: number; updated: number; moved: number; deleted: number };
    error?: { code: "validation" | "upstream" | "timeout" | "unknown"; message: string };
  };
  selectionChange: { ids: ReadonlySet<string>; count: number };
  textEditingChange: { editing: boolean };
  aiSlotAdded: {
    slotId: string;
    label: string;
    elementIds: string[];
    elements: Array<Record<string, unknown>>;
  };
  aiSlotsCountChange: { count: number };
}

export type TBoardEngineEvent = keyof IBoardEngineEvents;

export type TBoardEngineListener<E extends TBoardEngineEvent> = (
  data: IBoardEngineEvents[E],
) => void;

export interface IBoardEngineOptions {
  canvas: HTMLCanvasElement;
  container: HTMLDivElement;
  boardId: string;
  userId: string;
}

export class BoardEngine {
  public readonly camera: Camera;

  private readonly container: HTMLDivElement;
  private readonly containerRect: ContainerRect;
  private readonly events = new EventBus<IBoardEngineEvents>();
  private readonly userId: string;
  private readonly boardId: string;

  private readonly store: ElementStore;
  private readonly selection: SelectionManager;
  private readonly renderer: BoardRenderer;
  private readonly grid: GridRenderer;
  private readonly sync: BoardSync;
  private readonly commands: Commands;
  private readonly tools: ToolManager;
  private readonly editing: EditingController;
  private readonly wheelZoom: WheelZoom;
  private readonly pointerPan: PointerPan;
  private readonly cursorEmitter: CursorEmitter;
  private readonly zoomController: ZoomController;
  private readonly selectionBox: SelectionBox;
  private readonly keyboard: KeyboardHandler;
  private readonly anchorOverlay: AnchorOverlay;
  private readonly input: InputRouter;
  private readonly pasteHandler: PasteHandler;

  private readonly cameraPersistence: CameraPersistence;

  private unsubscribeSelectionChrome: (() => void) | null = null;
  private unsubscribeHandlerInit: (() => void) | null = null;
  private unsubscribeCameraZoomEmit: (() => void) | null = null;
  private unsubscribeSelectionEmit: (() => void) | null = null;

  constructor(options: IBoardEngineOptions) {
    const { canvas, container, boardId, userId } = options;

    this.container = container;
    this.containerRect = new ContainerRect(container);
    this.userId = userId;
    this.boardId = boardId;

    const core = this.buildCore();
    this.camera = core.camera;
    this.store = core.store;
    this.selection = core.selection;
    this.input = core.input;

    this.unsubscribeSelectionEmit = this.selection.subscribe(() => {
      const ids = this.selection.selectedIds;
      this.emit("selectionChange", { ids, count: ids.size });
    });

    this.unsubscribeHandlerInit = initHandlersForStore(this.store);

    const rendering = this.buildRendering(canvas);
    this.renderer = rendering.renderer;
    this.grid = rendering.grid;

    this.cameraPersistence = new CameraPersistence(this.camera, this.boardId);
    this.cameraPersistence.restore();
    this.cameraPersistence.attach();

    this.sync = this.buildSync();
    this.commands = new Commands({
      store: this.store,
      selection: this.selection,
      renderer: this.renderer,
      pushHistory: (entry) => this.sync.pushHistory(entry),
    });
    this.anchorOverlay = this.buildAnchorOverlay();

    const editing = this.buildEditing();
    this.tools = editing.tools;
    this.editing = editing.editing;

    const viewport = this.buildViewportInteractions();
    this.wheelZoom = viewport.wheelZoom;
    this.pointerPan = viewport.pointerPan;
    this.zoomController = viewport.zoomController;
    this.cursorEmitter = viewport.cursorEmitter;

    this.selectionBox = this.buildSelectionUi();
    this.keyboard = this.buildKeyboard();
    this.pasteHandler = this.buildPasteHandler();

    this.wireInputRouter();
  }

  // Подключает сокет, события мыши/клавиатуры и активирует select.
  start(): void {
    this.sync.connect();
    this.wheelZoom.attach();
    this.input.attach(this.container);
    this.keyboard.attach();
    this.pasteHandler.attach();
    this.anchorOverlay.attach();
    this.tools.getTool("select")?.onActivate?.();
  }

  // Отключает все подсистемы и освобождает ресурсы.
  destroy(): void {
    this.zoomController.destroy();
    this.sync.disconnect();
    this.wheelZoom.detach();
    this.input.detach();
    this.keyboard.detach();
    this.pasteHandler.detach();
    this.anchorOverlay.destroy();
    this.unsubscribeSelectionChrome?.();
    this.unsubscribeSelectionChrome = null;
    this.unsubscribeHandlerInit?.();
    this.unsubscribeHandlerInit = null;
    this.unsubscribeCameraZoomEmit?.();
    this.unsubscribeCameraZoomEmit = null;
    this.unsubscribeSelectionEmit?.();
    this.unsubscribeSelectionEmit = null;
    this.cameraPersistence.detach();
    this.containerRect.destroy();
    this.renderer.destroy();
    this.grid.destroy();
    this.editing.destroy();
    this.tools.getTool("select")?.onDeactivate?.();
    this.events.clear();
  }

  // Переключает активный инструмент. Сбрасывает выделение для всех кроме select.
  setTool(nextTool: TTool): void {
    const isSelect = nextTool === "select";
    if (!isSelect) this.selection.clearAll();
    this.selectionBox.setActiveTool(nextTool);
    this.pointerPan.setActiveTool(nextTool);
    this.tools.setActiveTool(nextTool);
    this.anchorOverlay.setMode(isSelect ? "selectOnly" : "off");
    this.emit("activeToolChange", nextTool);
  }

  // Переключает подтип карандаша (pencil/marker/highlighter).
  setPenTool(tool: TPenTool): void {
    this.tools.setPenTool(tool);
  }

  // Имя активного инструмента.
  getActiveTool(): string {
    return this.tools.getActiveTool();
  }

  // Имя активного подтипа карандаша.
  getActivePenTool(): string {
    return this.tools.getActivePenTool();
  }

  // Увеличивает масштаб на один шаг.
  zoomIn(): void {
    this.zoomController.zoomIn();
  }

  // Уменьшает масштаб на один шаг.
  zoomOut(): void {
    this.zoomController.zoomOut();
  }

  // Откатывает последнее действие истории.
  undo(): void {
    this.sync.undo();
  }

  // Применяет следующее действие истории, если есть.
  redo(): void {
    this.sync.redo();
  }

  // Удаляет все выделенные элементы одной записью истории "erase".
  deleteSelected(): void {
    const selectedIds = this.selection.selectedIds;
    if (selectedIds.size === 0) return;
    const elements: IElement[] = [];
    for (const id of selectedIds) {
      const el = this.store.getById(id);
      if (el) elements.push(el);
    }
    this.commands.deleteElements(elements);
  }

  // Публичный readonly доступ к id-шникам выделенных элементов.
  get selectedIds(): ReadonlySet<string> {
    return this.selection.selectedIds;
  }

  // Возвращает мировой bbox текущего выделения + количество элементов с bbox.
  // null если ничего не выделено или у всех выделенных нет bbox.
  // Используется SelectionToolbar для позиционирования overlay.
  getSelectionWorldBbox(): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    count: number;
  } | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let count = 0;
    for (const id of this.selection.selectedIds) {
      const el = this.store.getById(id);
      if (!el?.bbox) continue;
      count++;
      if (el.bbox.minX < minX) minX = el.bbox.minX;
      if (el.bbox.minY < minY) minY = el.bbox.minY;
      if (el.bbox.maxX > maxX) maxX = el.bbox.maxX;
      if (el.bbox.maxY > maxY) maxY = el.bbox.maxY;
    }
    if (count === 0 || !Number.isFinite(minX)) return null;
    return { minX, minY, maxX, maxY, count };
  }

  // Полная замена выделения извне (например, фокус на slot из чата).
  replaceSelection(ids: Set<string>): void {
    this.selection.replace(ids);
  }

  // Полный сброс выделения снаружи.
  clearSelection(): void {
    this.selection.clearAll();
  }

  // Подсказка для AI о текущем viewport: смещение/зум + центр и размер видимой
  // области в МИРОВЫХ координатах. Бэкенд кладёт новые элементы в этот центр,
  // чтобы они появлялись в зоне видимости пользователя, а не в углу холста.
  getViewportHint(): {
    x: number; y: number; zoom: number;
    cx?: number; cy?: number; vw?: number; vh?: number;
  } {
    const c = this.camera;
    const hint: { x: number; y: number; zoom: number; cx?: number; cy?: number; vw?: number; vh?: number } = {
      x: c.x, y: c.y, zoom: c.zoom,
    };
    const center = c.visibleWorldCenter();
    const size   = c.visibleWorldSize();
    if (center) { hint.cx = Math.round(center.x); hint.cy = Math.round(center.y); }
    if (size)   { hint.vw = Math.round(size.width); hint.vh = Math.round(size.height); }
    return hint;
  }

  // Центрирует камеру на bbox-центре переданных элементов и выделяет их.
  // Используется при клике на slot-чип в AI-чате.
  focusOnElements(ids: readonly string[]): void {
    const liveIds = new Set<string>();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of ids) {
      const el = this.store.getById(id);
      if (!el?.bbox) continue;
      liveIds.add(id);
      if (el.bbox.minX < minX) minX = el.bbox.minX;
      if (el.bbox.minY < minY) minY = el.bbox.minY;
      if (el.bbox.maxX > maxX) maxX = el.bbox.maxX;
      if (el.bbox.maxY > maxY) maxY = el.bbox.maxY;
    }
    if (liveIds.size === 0) return;
    this.selection.replace(liveIds);
    if (Number.isFinite(minX)) {
      this.camera.centerOn((minX + maxX) / 2, (minY + maxY) / 2);
    }
  }

  // Прикрепляет текущее выделение как AI context slot. Эмитит aiSlotAdded
  // с готовым label и slotId. AiChatWidget принимает событие и кладёт в state.
  // No-op если выделено 0 или > MAX_SLOT_ELEMENTS — guard рисуется в SelectionToolbar.
  attachSelectionAsSlot(): void {
    const ids = [...this.selection.selectedIds];
    if (ids.length === 0 || ids.length > MAX_SLOT_ELEMENTS) return;
    const label = generateSlotLabel(ids, this.store);
    const slotId = crypto.randomUUID();
    // Снапшоты прикрепляем сразу — на случай, если элемент ещё не долетел до
    // Redis к моменту AI-запроса; бэк использует их как фолбэк.
    const elements = ids
      .map((id) => this.store.getById(id))
      .filter((el): el is NonNullable<typeof el> => !!el)
      .map(snapshotElementForAi);
    this.emit("aiSlotAdded", { slotId, label, elementIds: ids, elements });
  }

  // Задаёт цвет заливки на всех тулах, которые поддерживают armed-color.
  setArmedColor(color: string): void {
    for (const tool of this.tools.allTools()) {
      if (hasSetArmedColor(tool)) tool.setArmedColor(color);
    }
  }

  // Задаёт активный shapeKind на всех тулах, поддерживающих armed-shape-kind.
  setArmedShapeKind(kind: TShapeKind): void {
    for (const tool of this.tools.allTools()) {
      if (hasSetArmedShapeKind(tool)) tool.setArmedShapeKind(kind);
    }
  }

  // Подписка на событие движка. Возвращает функцию отписки.
  on<E extends TBoardEngineEvent>(
    event: E,
    listener: TBoardEngineListener<E>,
  ): () => void {
    return this.events.on(event, listener);
  }

  // Уведомляет всех подписчиков события. Доступен внутри движка и для
  emit<E extends TBoardEngineEvent>(
    event: E,
    data: IBoardEngineEvents[E],
  ): void {
    this.events.emit(event, data);
  }

  // Фундамент: камера, хранилище элементов, выделение, роутер ввода.
  private buildCore(): {
    camera: Camera;
    store: ElementStore;
    selection: SelectionManager;
    input: InputRouter;
  } {
    const camera = new Camera();
    const store = new ElementStore();
    const selection = new SelectionManager(store);
    const input = new InputRouter();
    return { camera, store, selection, input };
  }

  // Рендерер канваса, сетка и кеш загруженных картинок.
  private buildRendering(canvas: HTMLCanvasElement): {
    renderer: BoardRenderer;
    grid: GridRenderer;
  } {
    const renderer = new BoardRenderer(
      canvas,
      this.container,
      this.camera,
      this.store,
    );

    const imageCache = new ImageCache(() => {
      renderer.rebuildBuffer();
      renderer.renderFrame();
    });
    this.store.setImageCache(imageCache);

    const grid = new GridRenderer(this.container, this.camera);

    this.selection.setRenderFn(() => renderer.renderFrame());
    this.unsubscribeSelectionChrome = renderer.addChromeDrawer((ctx, cam) =>
      this.selection.drawChrome(ctx, cam),
    );

    return { renderer, grid };
  }

  // WebSocket-синхронизация состояния доски с сервером.
  private buildSync(): BoardSync {
    return new BoardSync({
      store: this.store,
      selection: this.selection,
      renderer: this.renderer,
      boardId: this.boardId,
      callbacks: {
        onUsersChange: (users) => this.emit("usersChange", users),
        onUserLeft: (userId) => this.emit("userLeft", userId),
        onCursorUpdated: (data) => this.emit("cursorUpdated", data),
        onCursorRemoved: (userId) => this.emit("cursorRemoved", userId),
        onConnectionStatus: (status) => this.emit("connectionStatus", status),
        onBoardError: (message) => this.emit("boardError", message),
        onBoardReady: () => this.emit("boardReady", undefined),
        onRemoteElementsDeleted: (ids) => this.handleRemoteElementsDeleted(ids),
      },
      engine: this,
    });
  }

  // Оверлей точек привязки для коннекторов. Должен создаваться до buildEditing,
  // потому что SelectTool принимает его в конструкторе.
  private buildAnchorOverlay(): AnchorOverlay {
    const anchorOverlay = new AnchorOverlay({
      camera: this.camera,
      store: this.store,
      selection: this.selection,
      renderer: this.renderer,
    });
    anchorOverlay.setMode("selectOnly");
    return anchorOverlay;
  }

  // Регистрирует все инструменты и контроллер инлайн-редактирования текста/стикеров.
  private buildEditing(): {
    tools: ToolManager;
    editing: EditingController;
  } {
    const tools = new ToolManager();
    const editing = new EditingController({
      container: this.container,
      containerRect: this.containerRect,
      camera: this.camera,
      store: this.store,
      selection: this.selection,
      renderer: this.renderer,
      commands: this.commands,
      pushHistory: (entry) => this.sync.pushHistory(entry),
      onEditingChange: (editing) =>
        this.emit("textEditingChange", { editing }),
    });

    const toolDeps = {
      container: this.container,
      containerRect: this.containerRect,
      camera: this.camera,
      store: this.store,
      selection: this.selection,
      renderer: this.renderer,
      boardId: this.boardId,
      commands: this.commands,
      pushHistory: (entry: Parameters<BoardSync["pushHistory"]>[0]) =>
        this.sync.pushHistory(entry),
      getActiveTool: () => tools.getResolvedTool(),
      openEdit: (el: IElement) => editing.openEdit(el),
      setActiveTool: (tool: TTool) => this.setTool(tool),
    };

    tools.register("pencil", new PencilTool(toolDeps));
    tools.register("eraser", new EraserTool(toolDeps));
    tools.register("select", new SelectTool(toolDeps, this.anchorOverlay));
    tools.register("text", new TextTool(toolDeps));
    tools.register("sticky", new StickyTool(toolDeps));
    tools.register("shape", new ShapeTool(toolDeps));

    return { tools, editing };
  }

  // Зум колесом, панорамирование мышью, кнопочный зум и эмиттер курсора.
  private buildViewportInteractions(): {
    wheelZoom: WheelZoom;
    pointerPan: PointerPan;
    zoomController: ZoomController;
    cursorEmitter: CursorEmitter;
  } {
    const wheelZoom = new WheelZoom(
      this.container,
      this.containerRect,
      this.camera,
      this.schedulePanRender,
      this.scheduleZoomRender,
    );

    const pointerPan = new PointerPan(
      this.container,
      this.containerRect,
      this.camera,
      this.schedulePanRender,
      this.scheduleZoomRender,
      () => this.tools.isEngaged(),
    );

    const zoomController = new ZoomController(
      this.container,
      this.camera,
      this.scheduleZoomRender,
    );

    const cursorEmitter = new CursorEmitter(
      this.containerRect,
      this.camera,
      (wx, wy) => this.sync.emitCursorMove(wx, wy),
    );

    // Единый источник zoomChange: камера notify ловит и wheel, и pinch, и кнопочный зум.
    let lastZoom = this.camera.zoom;
    this.unsubscribeCameraZoomEmit = this.camera.subscribe(() => {
      if (this.camera.zoom === lastZoom) return;
      lastZoom = this.camera.zoom;
      this.emit("zoomChange", this.camera.zoom);
    });

    return { wheelZoom, pointerPan, zoomController, cursorEmitter };
  }

  // Прямоугольная рамка выделения мышью.
  private buildSelectionUi(): SelectionBox {
    return new SelectionBox({
      el: this.container,
      containerRect: this.containerRect,
      camera: this.camera,
      scheduleRender: this.schedulePanRender,
      onBoxChange: (box) => this.emit("selectionBoxChange", box),
      onSelectionEnd: (wMinX, wMinY, wMaxX, wMaxY) => {
        this.selection.selectInRect(wMinX, wMinY, wMaxX, wMaxY);
      },
      onSelectionPreview: (wMinX, wMinY, wMaxX, wMaxY) => {
        this.selection.previewSelectInRect(wMinX, wMinY, wMaxX, wMaxY);
      },
    });
  }

  // Глобальные хоткеи undo/redo/delete.
  private buildKeyboard(): KeyboardHandler {
    return new KeyboardHandler({
      undo: () => this.sync.undo(),
      redo: () => this.sync.redo(),
      deleteSelected: () => this.deleteSelected(),
    });
  }

  // Вставка картинок из буфера обмена с загрузкой на сервер.
  private buildPasteHandler(): PasteHandler {
    const uploader = new ImageUploader({
      sync: this.sync,
      store: this.store,
      renderer: this.renderer,
      commands: this.commands,
      boardId: this.boardId,
    });
    return new PasteHandler({
      container: this.container,
      containerRect: this.containerRect,
      camera: this.camera,
      store: this.store,
      selection: this.selection,
      renderer: this.renderer,
      input: this.input,
      commands: this.commands,
      pushHistory: (entry) => this.sync.pushHistory(entry),
      uploader,
      boardId: this.boardId,
      userId: this.userId,
      onToast: (msg) => this.emit("toast", msg),
    });
  }

  // Подключает участников к роутеру событий ввода.
  private wireInputRouter(): void {
    this.input.register(this.tools);
    this.input.register(this.selectionBox);
    this.input.observe(this.pointerPan);
    this.input.observe(this.cursorEmitter);
  }

  // Перерисовка сетки и канваса при панорамировании.
  private schedulePanRender = (): void => {
    this.grid.schedulePanRender();
    this.renderer.schedulePanRender();
  };

  // Перерисовка с пересборкой буфера при изменении масштаба.
  private scheduleZoomRender = (): void => {
    this.grid.scheduleZoomRender();
    this.renderer.scheduleBufferRebuild();
  };

  // Закрывает редактор, если редактируемый элемент удалили на другой вкладке.
  private handleRemoteElementsDeleted(ids: Set<string>): void {
    const id = this.editing.getEditingId();
    if (id && ids.has(id)) this.editing.cancelExternal(id);
  }
}
