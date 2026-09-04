import { IInputObserver } from "@engine/input/InputRouter";
import { Camera } from "@engine/core/Camera";
import { ContainerRect } from "@engine/core/ContainerRect";

type PointerMap = Map<number, { x: number; y: number }>;

// Pan камерой одним указателем (для тулов, которым drag не занят) и
// pinch-zoom двумя пальцами на тач-устройствах.
export class PointerPan implements IInputObserver {
  readonly name = "PointerPan";

  private container: HTMLDivElement;
  private containerRect: ContainerRect;
  private camera: Camera;
  private onPanRender: () => void;
  private onZoomRender: () => void;
  private isToolEngaged: () => boolean;
  private activeTool = "select";
  private pointers: PointerMap = new Map();

  constructor(
    container: HTMLDivElement,
    containerRect: ContainerRect,
    camera: Camera,
    onPanRender: () => void,
    onZoomRender: () => void,
    isToolEngaged: () => boolean,
  ) {
    this.container = container;
    this.containerRect = containerRect;
    this.camera = camera;
    this.onPanRender = onPanRender;
    this.onZoomRender = onZoomRender;
    this.isToolEngaged = isToolEngaged;
  }

  // Меняет активный инструмент. Влияет на разрешение single-pointer pan.
  setActiveTool(tool: string): void {
    this.activeTool = tool;
  }

  // Запоминаем pointer и захватываем его, чтобы продолжать получать события вне контейнера.
  onDown(e: PointerEvent): void {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      // setPointerCapture может бросить в некоторых браузерах при некорректном id.
      this.container.setPointerCapture(e.pointerId);
    } catch {}
  }

  // По числу активных pointers решает: pan, pinch-zoom или ничего.
  // Пока какой-то tool захватил жест, не двигаем камеру — обновляем только позицию pointer,
  // иначе на touch второй палец дёргает pan/pinch параллельно с активным рисованием.
  onMove(e: PointerEvent): void {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;

    if (this.isToolEngaged()) {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }

    if (this.pointers.size === 1 && this.singlePointerPanAllowed()) {
      this.handlePan(e, prev);
    } else if (this.pointers.size === 2) {
      this.handlePinchZoom(e, prev);
    }

    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  onUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
  }

  onCancel(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
  }

  // Двигает камеру на дельту от прошлой позиции pointer.
  private handlePan(e: PointerEvent, prev: { x: number; y: number }): void {
    this.camera.pan(e.clientX - prev.x, e.clientY - prev.y);
    this.onPanRender();
  }

  // Pinch-zoom: масштаб камеры по отношению расстояний между пальцами,
  // якорь в центре между ними.
  private handlePinchZoom(
    e: PointerEvent,
    prev: { x: number; y: number },
  ): void {
    const entries = [...this.pointers.entries()];
    const otherId =
      entries[0][0] === e.pointerId ? entries[1][0] : entries[0][0];
    const other = this.pointers.get(otherId)!;
    const oldDist = Math.hypot(prev.x - other.x, prev.y - other.y);
    const newDist = Math.hypot(e.clientX - other.x, e.clientY - other.y);
    // Игнорируем дрожание пальцев и защищаемся от деления на близкое к нулю.
    if (oldDist > 1) {
      const rect = this.containerRect.get();
      const cx = (e.clientX + other.x) / 2 - rect.left;
      const cy = (e.clientY + other.y) / 2 - rect.top;
      this.camera.zoomBy(newDist / oldDist, cx, cy);
    }
    this.onZoomRender();
  }

  // Single-pointer pan разрешён для всех тулов кроме тех, кто сам обрабатывает
  // одиночный drag: select (SelectionBox), pen (рисование), text (создание).
  private singlePointerPanAllowed(): boolean {
    const tool = this.activeTool;
    return tool !== "select" && tool !== "pen" && tool !== "text";
  }
}
