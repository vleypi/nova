import { IShapeElement, TShapeKind } from "@engine/types";
import { getHandler } from "@engine/elements/element-registry";
import { hitTestElement } from "@engine/utils/hit";
import {
  DEFAULT_SHAPE_FILL,
  DEFAULT_SHAPE_SIZE,
  DEFAULT_STROKE_COLOR,
  DEFAULT_STROKE_WIDTH,
  MIN_SHAPE_SIZE,
  SELECTION_CLICK_THRESHOLD_PX,
  SHAPE_DEFAULT_FONT_SIZE,
} from "@/features/board/constants/board.constant";
import { BaseTool, IToolDeps } from "./BaseTool";

// Инструмент создания базовых фигур (rect, ellipse, diamond, triangle).
// Жест: drag-out-rect или click-to-default. Shift во время drag фиксирует aspect 1:1.
// После создания одной фигуры автопереключается на select, новая фигура выделена.
export class ShapeTool extends BaseTool {
  // Текущий armed-подвид. Меняется через setArmedShapeKind (duck-type из BoardEngine).
  private armedShapeKind: TShapeKind = "rect";
  // Превью-фигура во время drag. Рисуется тем же drawShape, что и committed-фигура.
  private draftShape: IShapeElement | null = null;
  // Стартовая мировая точка drag-жеста (фиксируется в onDown).
  private dragStartWorld: { x: number; y: number } | null = null;
  // Стартовая экранная точка для оценки click vs drag.
  private dragStartScreen: { x: number; y: number } | null = null;
  // Отписка world-drawer'а, зарегистрированного в onActivate.
  private disposeDrawer: (() => void) | null = null;

  constructor(deps: IToolDeps) {
    super(deps);
  }

  // Курсор crosshair, регистрация world-drawer для preview.
  onActivate(): void {
    this.container.style.cursor = "crosshair";
    this.disposeDrawer = this.renderer.addWorldDrawer((ctx) =>
      this.drawDraft(ctx),
    );
  }

  // Сброс курсора, отмена drawer и активного draft (если был).
  onDeactivate(): void {
    this.container.style.cursor = "";
    this.disposeDrawer?.();
    this.disposeDrawer = null;
    this.draftShape = null;
    this.dragStartWorld = null;
    this.dragStartScreen = null;
  }

  // Меняет armed shapeKind. Зовётся из BoardEngine.setArmedShapeKind через duck-type.
  setArmedShapeKind(kind: TShapeKind): void {
    this.armedShapeKind = kind;
  }

  // Старт жеста: фиксируем точки и создаём draft с нулевым size.
  // Если кликнули по существующей фигуре — переключаемся в select и открываем её редактор,
  // вместо создания новой поверх. Иначе ShapeTool оверлеит фигуры при попытке кликнуть в них.
  onDown(event: PointerEvent): boolean {
    if (event.button !== 0) return false;
    const world = this.screenToWorld(event.clientX, event.clientY);

    const existingShape = this.findShapeAt(world.x, world.y);
    if (existingShape) {
      this.setActiveTool("select");
      this.openEdit(existingShape);
      return true;
    }

    this.dragStartWorld = world;
    this.dragStartScreen = { x: event.clientX, y: event.clientY };
    this.draftShape = {
      id: crypto.randomUUID(),
      type: "shape",
      userId: "",
      boardId: this.boardId,
      createdAt: Date.now(),
      shapeKind: this.armedShapeKind,
      x: world.x,
      y: world.y,
      width: 0,
      height: 0,
      strokeColor: DEFAULT_STROKE_COLOR,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      fillColor: DEFAULT_SHAPE_FILL,
      text: "",
      html: "",
      fontSize: SHAPE_DEFAULT_FONT_SIZE,
      autoFontSize: true,
      textAlign: "center",
    };
    this.renderer.scheduleRender();
    return true;
  }

  // Обновление draft под текущую позицию указателя. Shift фиксирует aspect 1:1.
  onMove(event: PointerEvent): void {
    if (!this.draftShape || !this.dragStartWorld) return;
    const current = this.screenToWorld(event.clientX, event.clientY);
    const rect = this.normalizeDragRect(
      this.dragStartWorld,
      current,
      event.shiftKey,
    );
    this.draftShape.x = rect.x;
    this.draftShape.y = rect.y;
    this.draftShape.width = rect.width;
    this.draftShape.height = rect.height;
    this.renderer.scheduleRender();
  }

  // Финализация: либо drag-фигура с минимальным размером, либо click-to-default.
  // Затем автопереключение в select с выделением новой фигуры.
  onUp(event: PointerEvent): void {
    const draft = this.draftShape;
    const startWorld = this.dragStartWorld;
    const startScreen = this.dragStartScreen;
    this.draftShape = null;
    this.dragStartWorld = null;
    this.dragStartScreen = null;

    if (!draft || !startWorld || !startScreen) return;

    const dx = event.clientX - startScreen.x;
    const dy = event.clientY - startScreen.y;
    const screenDist = Math.hypot(dx, dy);
    if (screenDist < SELECTION_CLICK_THRESHOLD_PX) {
      // Click без drag: создаём фигуру дефолтного размера с центром в стартовой точке.
      draft.x = startWorld.x - DEFAULT_SHAPE_SIZE / 2;
      draft.y = startWorld.y - DEFAULT_SHAPE_SIZE / 2;
      draft.width = DEFAULT_SHAPE_SIZE;
      draft.height = DEFAULT_SHAPE_SIZE;
    } else {
      // Drag: clamp min-side, чтобы не было нулевых сторон.
      draft.width = Math.max(MIN_SHAPE_SIZE, draft.width);
      draft.height = Math.max(MIN_SHAPE_SIZE, draft.height);
    }

    const handler = getHandler("shape");
    handler.computeBbox(draft, this.store);
    this.commands.createElement(draft);

    this.setActiveTool("select");
    this.selection.replace(new Set([draft.id]));
  }

  // Рисует preview-фигуру через тот же drawShape, что и committed: гарантия no-jump.
  private drawDraft(ctx: CanvasRenderingContext2D): void {
    if (!this.draftShape) return;
    if (this.draftShape.width <= 0 || this.draftShape.height <= 0) return;
    getHandler("shape").draw(ctx, this.draftShape, this.store);
  }

  // Ищет верхнюю shape под мировой точкой; null если нет.
  // Идём от topmost к bottommost — z-order реверс store.getAll().
  private findShapeAt(worldX: number, worldY: number): IShapeElement | null {
    const elements = this.store.getAll();
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === "shape" && hitTestElement(worldX, worldY, el, this.store)) {
        return el as IShapeElement;
      }
    }
    return null;
  }

  // Превращает (start, current) в нормализованный bbox-прямоугольник.
  // С Shift сторона = max(|dx|, |dy|), aspect 1:1, направление по знаку.
  private normalizeDragRect(
    start: { x: number; y: number },
    current: { x: number; y: number },
    aspectLock: boolean,
  ): { x: number; y: number; width: number; height: number } {
    let dx = current.x - start.x;
    let dy = current.y - start.y;
    if (aspectLock) {
      const side = Math.max(Math.abs(dx), Math.abs(dy));
      dx = side * (dx < 0 ? -1 : 1);
      dy = side * (dy < 0 ? -1 : 1);
    }
    const x = dx >= 0 ? start.x : start.x + dx;
    const y = dy >= 0 ? start.y : start.y + dy;
    return { x, y, width: Math.abs(dx), height: Math.abs(dy) };
  }
}
