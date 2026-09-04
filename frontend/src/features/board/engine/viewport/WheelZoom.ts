import { Camera } from "@engine/core/Camera";
import { ContainerRect } from "@engine/core/ContainerRect";
import { WHEEL_ZOOM_SENSITIVITY } from "@/features/board/constants/board.constant";

// Cap deltaY per event — мышиное колесо отдаёт ~100px за тик (deltaMode=0 в современных
// браузерах), что даёт фактор exp(-1)=0.37 за тик и ощущается рывками. Трекпад типично
// отдаёт 1-10px, cap его не задевает. Без cap mouse-wheel zoom режет глаз.
const WHEEL_DELTA_CAP = 25;

// Обработчик колеса мыши/трекпада: Ctrl или Cmd + wheel зумит,
// обычный wheel панорамирует камеру.
export class WheelZoom {
  private container: HTMLDivElement;
  private containerRect: ContainerRect;
  private camera: Camera;
  private onPanRender: () => void;
  private onZoomRender: () => void;
  private boundOnWheel: (e: WheelEvent) => void;

  constructor(
    container: HTMLDivElement,
    containerRect: ContainerRect,
    camera: Camera,
    onPanRender: () => void,
    onZoomRender: () => void,
  ) {
    this.container = container;
    this.containerRect = containerRect;
    this.camera = camera;
    this.onPanRender = onPanRender;
    this.onZoomRender = onZoomRender;
    this.boundOnWheel = this.onWheel.bind(this);
  }

  // Подписывается на wheel-события. passive: false нужен для preventDefault.
  attach(): void {
    this.container.addEventListener("wheel", this.boundOnWheel, {
      passive: false,
    });
  }

  detach(): void {
    this.container.removeEventListener("wheel", this.boundOnWheel);
  }

  // С Ctrl/Cmd зумит экспоненциально вокруг курсора, иначе панит на дельту wheel.
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const rect = this.containerRect.get();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dy = Math.max(-WHEEL_DELTA_CAP, Math.min(WHEEL_DELTA_CAP, e.deltaY));
      const factor = Math.exp(-dy * WHEEL_ZOOM_SENSITIVITY);
      this.camera.zoomBy(factor, mx, my);
      this.onZoomRender();
    } else {
      this.camera.pan(-e.deltaX, -e.deltaY);
      this.onPanRender();
    }
  }
}
