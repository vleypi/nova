import { ISelectionBox } from "@engine/types";
import { IInputHandler } from "@engine/input/InputRouter";
import { INPUT_PRIORITY } from "@engine/input/priorities";
import { Camera } from "@engine/core/Camera";
import { ContainerRect } from "@engine/core/ContainerRect";
import {
  SELECTION_AUTOPAN_EDGE_MARGIN,
  SELECTION_AUTOPAN_SPEED,
  SELECTION_CLICK_THRESHOLD_PX,
} from "@/features/board/constants/board.constant";

type WorldRectCallback = (
  wMinX: number,
  wMinY: number,
  wMaxX: number,
  wMaxY: number,
) => void;

interface ISelectionBoxDeps {
  el: HTMLDivElement;
  containerRect: ContainerRect;
  camera: Camera;
  scheduleRender: () => void;
  onBoxChange: (box: ISelectionBox | null) => void;
  onSelectionEnd: WorldRectCallback;
  onSelectionPreview?: WorldRectCallback;
}

// Input-handler инструмента select: рисует прямоугольник выделения по drag,
// пушит preview во время движения, на отпускании финализирует выбор.
// При приближении курсора к краю контейнера автоматически панит камеру.
export class SelectionBox implements IInputHandler {
  readonly name = "SelectionBox";
  readonly priority = INPUT_PRIORITY.SELECTION_BOX;

  private container: HTMLDivElement;
  private containerRect: ContainerRect;
  private camera: Camera;
  private scheduleRender: () => void;
  private onBoxChange: (box: ISelectionBox | null) => void;
  private onSelectionEnd: WorldRectCallback;
  private onSelectionPreview?: WorldRectCallback;

  private activeTool = "select";
  private startWorld: { x: number; y: number } | null = null;
  private cursorClient: { x: number; y: number } | null = null;
  private panRaf = 0;

  constructor(deps: ISelectionBoxDeps) {
    this.container = deps.el;
    this.containerRect = deps.containerRect;
    this.camera = deps.camera;
    this.scheduleRender = deps.scheduleRender;
    this.onBoxChange = deps.onBoxChange;
    this.onSelectionEnd = deps.onSelectionEnd;
    this.onSelectionPreview = deps.onSelectionPreview;
  }

  // Меняет активный инструмент. SelectionBox реагирует только на "select".
  setActiveTool(tool: string): void {
    this.activeTool = tool;
  }

  // Старт drag: запоминаем мировую точку, инициируем preview из точки в точку.
  onDown(e: PointerEvent): boolean | void {
    if (this.activeTool !== "select" || e.button !== 0) return;
    const { wx, wy } = this.clientToWorld(e.clientX, e.clientY);
    this.startWorld = { x: wx, y: wy };
    this.cursorClient = { x: e.clientX, y: e.clientY };
    this.onSelectionPreview?.(wx, wy, wx, wy);
    return true;
  }

  // Движение: обновляем экранную рамку, запускаем авто-пан, обновляем preview выделения.
  onMove(e: PointerEvent): void {
    if (!this.startWorld) return;
    this.cursorClient = { x: e.clientX, y: e.clientY };
    this.updateBox();
    this.maybeStartAutoPan();
    if (this.onSelectionPreview) {
      const { wx, wy } = this.clientToWorld(e.clientX, e.clientY);
      this.onSelectionPreview(
        Math.min(this.startWorld.x, wx),
        Math.min(this.startWorld.y, wy),
        Math.max(this.startWorld.x, wx),
        Math.max(this.startWorld.y, wy),
      );
    }
  }

  // Отпускание: финализируем выбор. Маленький drag трактуется как клик в точку.
  onUp(_e: PointerEvent): void {
    if (!this.startWorld) return;
    if (this.cursorClient) {
      const { wx, wy } = this.clientToWorld(
        this.cursorClient.x,
        this.cursorClient.y,
      );
      const wMinX = Math.min(this.startWorld.x, wx);
      const wMinY = Math.min(this.startWorld.y, wy);
      const wMaxX = Math.max(this.startWorld.x, wx);
      const wMaxY = Math.max(this.startWorld.y, wy);
      const screenDist = Math.max(
        Math.abs(wx - this.startWorld.x) * this.camera.zoom,
        Math.abs(wy - this.startWorld.y) * this.camera.zoom,
      );
      if (screenDist < SELECTION_CLICK_THRESHOLD_PX) {
        const { x, y } = this.startWorld;
        this.onSelectionEnd(x, y, x, y);
      } else {
        this.onSelectionEnd(wMinX, wMinY, wMaxX, wMaxY);
      }
    }
    this.reset();
  }

  // Системная отмена жеста (например, второй палец) обрабатывается как up.
  onCancel(e: PointerEvent): void {
    this.onUp(e);
  }

  // Сброс состояния, отмена авто-пан кадра, уведомление UI о пропаже рамки.
  private reset(): void {
    this.startWorld = null;
    this.cursorClient = null;
    cancelAnimationFrame(this.panRaf);
    this.panRaf = 0;
    this.onBoxChange(null);
  }

  // Пересчитывает экранный прямоугольник рамки и пушит наружу для рендера.
  private updateBox(): void {
    if (!this.startWorld || !this.cursorClient) return;
    const cam = this.camera;
    const rect = this.containerRect.get();
    const sx = this.startWorld.x * cam.zoom + cam.x;
    const sy = this.startWorld.y * cam.zoom + cam.y;
    const cx = this.cursorClient.x - rect.left;
    const cy = this.cursorClient.y - rect.top;
    this.onBoxChange({
      x: Math.min(sx, cx),
      y: Math.min(sy, cy),
      width: Math.abs(cx - sx),
      height: Math.abs(cy - sy),
    });
  }

  // Кадр авто-пана: считает скорость, двигает камеру, перерисовывает, планирует следующий кадр.
  private autoPanTick(): void {
    if (!this.cursorClient || !this.startWorld) {
      this.panRaf = 0;
      return;
    }
    const v = this.computeAutoPanVelocity();
    if (v.dx === 0 && v.dy === 0) {
      this.panRaf = 0;
      return;
    }
    this.camera.pan(v.dx, v.dy);
    this.scheduleRender();
    this.updateBox();
    this.panRaf = requestAnimationFrame(() => this.autoPanTick());
  }

  // Если курсор у края и авто-пан ещё не запущен, запускает первый кадр.
  private maybeStartAutoPan(): void {
    if (this.panRaf || !this.cursorClient) return;
    const v = this.computeAutoPanVelocity();
    if (v.dx !== 0 || v.dy !== 0) {
      this.panRaf = requestAnimationFrame(() => this.autoPanTick());
    }
  }

  // Считает скорость пана камеры по близости курсора к краю контейнера.
  // Чем ближе к краю, тем больше абсолютное значение dx/dy.
  private computeAutoPanVelocity(): { dx: number; dy: number } {
    if (!this.cursorClient) return { dx: 0, dy: 0 };
    const rect = this.containerRect.get();
    const px = this.cursorClient.x;
    const py = this.cursorClient.y;
    const margin = SELECTION_AUTOPAN_EDGE_MARGIN;
    const speed = SELECTION_AUTOPAN_SPEED;
    let dx = 0;
    let dy = 0;
    if (px < rect.left + margin) {
      dx = ((rect.left + margin - px) / margin) * speed;
    } else if (px > rect.right - margin) {
      dx = -((px - rect.right + margin) / margin) * speed;
    }
    if (py < rect.top + margin) {
      dy = ((rect.top + margin - py) / margin) * speed;
    } else if (py > rect.bottom - margin) {
      dy = -((py - rect.bottom + margin) / margin) * speed;
    }
    return { dx, dy };
  }

  // Конвертирует client-координаты в мировые.
  private clientToWorld(
    clientX: number,
    clientY: number,
  ): { wx: number; wy: number } {
    const rect = this.containerRect.get();
    return this.camera.screenToWorld(clientX - rect.left, clientY - rect.top);
  }
}
