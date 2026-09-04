import { ICamera } from "@engine/types";
import {
  MIN_ZOOM,
  MAX_ZOOM,
  BOARD_WORLD_WIDTH,
  BOARD_WORLD_HEIGHT,
} from "@/features/board/constants/board.constant";
import { clamp } from "@engine/utils/math";

// Хранит смещение и масштаб. Поля приватные: снаружи читаем через геттеры,
// меняем только через методы класса. Иначе можно обойти clamp и не дёрнуть notify.
// Камера hard-clamp'ит viewport в пределах рабочей области BOARD_WORLD_WIDTH x BOARD_WORLD_HEIGHT.
export class Camera implements ICamera {
  private _x = 0;
  private _y = 0;
  private _zoom = 1;
  // Размер viewport в CSS-пикселях. Нужен для bounds-clamp смещения и динамического MIN_ZOOM.
  // BoardRenderer выставляет через setViewportSize при ResizeObserver-апдейтах.
  private viewportWidth = 0;
  private viewportHeight = 0;

  private readonly listeners: Set<() => void> = new Set();

  // Текущее смещение по X в экранных пикселях.
  get x(): number {
    return this._x;
  }

  // Текущее смещение по Y в экранных пикселях.
  get y(): number {
    return this._y;
  }

  // Текущий масштаб (зажат между MIN_ZOOM и MAX_ZOOM).
  get zoom(): number {
    return this._zoom;
  }

  // Подписка на изменения камеры. Возвращает функцию отписки.
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Обновляет известный камере размер viewport. Сразу пере-clamp'ит зум и смещение,
  // чтобы при ресайзе окна камера не оказалась в невалидном состоянии.
  setViewportSize(widthCss: number, heightCss: number): void {
    if (widthCss === this.viewportWidth && heightCss === this.viewportHeight) {
      return;
    }
    this.viewportWidth = widthCss;
    this.viewportHeight = heightCss;
    this._zoom = clamp(this._zoom, this.minZoomForViewport(), MAX_ZOOM);
    const offset = this.clampOffset(this._x, this._y, this._zoom);
    this._x = offset.x;
    this._y = offset.y;
    this.notify();
  }

  // Сдвигает камеру на dx/dy в экранных пикселях.
  pan(dx: number, dy: number): void {
    const offset = this.clampOffset(this._x + dx, this._y + dy, this._zoom);
    this._x = offset.x;
    this._y = offset.y;
    this.notify();
  }

  // Умножает зум на factor вокруг точки якоря (anchorX/Y в экранных пикселях).
  zoomBy(factor: number, anchorX: number, anchorY: number): void {
    this.applyZoom(this._zoom * factor, anchorX, anchorY);
  }

  // Ставит зум в указанное значение вокруг точки якоря (anchorX/Y в экранных пикселях).
  zoomTo(newZoom: number, anchorX: number, anchorY: number): void {
    this.applyZoom(newZoom, anchorX, anchorY);
  }

  // Переводит мировые координаты в экранные.
  worldToScreen(
    wx: number,
    wy: number,
  ): {
    sx: number;
    sy: number;
  } {
    return { sx: wx * this._zoom + this._x, sy: wy * this._zoom + this._y };
  }

  // Переводит экранные координаты в мировые.
  screenToWorld(
    sx: number,
    sy: number,
  ): {
    wx: number;
    wy: number;
  } {
    return { wx: (sx - this._x) / this._zoom, wy: (sy - this._y) / this._zoom };
  }

  // Снимок состояния для истории/сериализации.
  snapshot(): ICamera {
    return { x: this._x, y: this._y, zoom: this._zoom };
  }

  // Центр видимой области в МИРОВЫХ координатах. Нужно AI, чтобы создавать новые
  // элементы в текущей зоне видимости пользователя, а не в углу холста.
  // null, если размер viewport ещё не известен (до первого setViewportSize).
  visibleWorldCenter(): { x: number; y: number } | null {
    if (this.viewportWidth <= 0 || this.viewportHeight <= 0) return null;
    const { wx, wy } = this.screenToWorld(this.viewportWidth / 2, this.viewportHeight / 2);
    return { x: wx, y: wy };
  }

  // Размер видимой области в МИРОВЫХ единицах (ширина/высота). null до setViewportSize.
  visibleWorldSize(): { width: number; height: number } | null {
    if (this.viewportWidth <= 0 || this.viewportHeight <= 0) return null;
    return { width: this.viewportWidth / this._zoom, height: this.viewportHeight / this._zoom };
  }

  // Восстанавливает состояние из снимка с clamp. Снимок мог быть сделан при другом
  // viewport (после ресайза окна), поэтому значения могут не вписываться в текущие границы.
  copyFrom(source: ICamera): void {
    const z = clamp(source.zoom, this.minZoomForViewport(), MAX_ZOOM);
    const offset = this.clampOffset(source.x, source.y, z);
    this._x = offset.x;
    this._y = offset.y;
    this._zoom = z;
    this.notify();
  }

  // Центрирует viewport на середине рабочей области. Используется при первом открытии доски,
  // когда нет сохранённой позиции.
  centerView(zoom = 1): void {
    if (this.viewportWidth <= 0 || this.viewportHeight <= 0) return;
    const z = clamp(zoom, this.minZoomForViewport(), MAX_ZOOM);
    this._zoom = z;
    this._x = (this.viewportWidth - BOARD_WORLD_WIDTH * z) / 2;
    this._y = (this.viewportHeight - BOARD_WORLD_HEIGHT * z) / 2;
    this.notify();
  }

  // Центрирует viewport на конкретной мировой точке без изменения зума.
  // Используется AI-системой для скролла к первому созданному элементу транзакции.
  // Мгновенный (без easing). Учитывает clampOffset чтобы не уехать за границы доски.
  centerOn(worldX: number, worldY: number): void {
    if (this.viewportWidth <= 0 || this.viewportHeight <= 0) return;
    const targetX = this.viewportWidth / 2 - worldX * this._zoom;
    const targetY = this.viewportHeight / 2 - worldY * this._zoom;
    const offset = this.clampOffset(targetX, targetY, this._zoom);
    this._x = offset.x;
    this._y = offset.y;
    this.notify();
  }

  // Применяет новый зум с сохранением точки якоря на экране.
  // anchorX/anchorY заданы в экранных координатах: точка под курсором
  // должна остаться под курсором после изменения масштаба.
  private applyZoom(targetZoom: number, anchorX: number, anchorY: number): void {
    const clampedZoom = clamp(targetZoom, this.minZoomForViewport(), MAX_ZOOM);
    const ratio = clampedZoom / this._zoom;
    const newX = anchorX - ratio * (anchorX - this._x);
    const newY = anchorY - ratio * (anchorY - this._y);
    const offset = this.clampOffset(newX, newY, clampedZoom);
    this._x = offset.x;
    this._y = offset.y;
    this._zoom = clampedZoom;
    this.notify();
  }

  // Минимальный зум, при котором мир ещё полностью покрывает viewport.
  // Глубже зум-аут запрещён, иначе появятся пустые поля за границами рабочей области.
  private minZoomForViewport(): number {
    if (this.viewportWidth <= 0 || this.viewportHeight <= 0) return MIN_ZOOM;
    const fitX = this.viewportWidth / BOARD_WORLD_WIDTH;
    const fitY = this.viewportHeight / BOARD_WORLD_HEIGHT;
    return Math.max(MIN_ZOOM, fitX, fitY);
  }

  // Прижимает смещение так, чтобы viewport оставался строго внутри рабочей области.
  // При нулевом viewport (до первого setViewportSize) clamp пропускается.
  private clampOffset(
    x: number,
    y: number,
    zoom: number,
  ): { x: number; y: number } {
    if (this.viewportWidth <= 0 || this.viewportHeight <= 0) return { x, y };
    const maxX = 0;
    const minX = this.viewportWidth - BOARD_WORLD_WIDTH * zoom;
    const maxY = 0;
    const minY = this.viewportHeight - BOARD_WORLD_HEIGHT * zoom;
    return {
      x: clamp(x, minX, maxX),
      y: clamp(y, minY, maxY),
    };
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
