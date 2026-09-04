import {
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP_FACTOR,
  ZOOM_ANIMATION_EASING,
  ZOOM_ANIMATION_EPSILON,
} from "@/features/board/constants/board.constant";
import { clamp } from "@engine/utils/math";
import { Camera } from "@engine/core/Camera";

// Кнопочный плавный зум камеры с якорем в центре контейнера.
// Анимирует камеру к target через requestAnimationFrame с экспоненциальным easing.
// Повторный вызов zoomIn/zoomOut во время анимации просто обновляет target.
export class ZoomController {
  private container: HTMLDivElement;
  private camera: Camera;
  private onZoomRender: () => void;
  private raf = 0;
  private target = 1;

  constructor(
    container: HTMLDivElement,
    camera: Camera,
    onZoomRender: () => void,
  ) {
    this.container = container;
    this.camera = camera;
    this.onZoomRender = onZoomRender;
  }

  // Один шаг увеличения масштаба.
  zoomIn(): void {
    this.animateTo(this.camera.zoom * ZOOM_STEP_FACTOR);
  }

  // Один шаг уменьшения масштаба.
  zoomOut(): void {
    this.animateTo(this.camera.zoom / ZOOM_STEP_FACTOR);
  }

  // Останавливает текущую анимацию.
  destroy(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  // Запускает RAF-анимацию к target. Если анимация уже идёт, только обновляет цель.
  private animateTo(target: number): void {
    this.target = clamp(target, MIN_ZOOM, MAX_ZOOM);
    if (this.raf) return;
    const tick = () => {
      const diff = this.target - this.camera.zoom;
      const isFinal = Math.abs(diff) < ZOOM_ANIMATION_EPSILON;
      const nextZoom = isFinal
        ? this.target
        : this.camera.zoom + diff * ZOOM_ANIMATION_EASING;
      const { cx, cy } = this.centerPoint();
      this.camera.zoomTo(nextZoom, cx, cy);
      this.onZoomRender();
      if (isFinal) {
        this.raf = 0;
      } else {
        this.raf = requestAnimationFrame(tick);
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  // Центр контейнера в его собственных координатах. Используется как якорь зума.
  private centerPoint(): { cx: number; cy: number } {
    const rect = this.container.getBoundingClientRect();
    return { cx: rect.width / 2, cy: rect.height / 2 };
  }
}
