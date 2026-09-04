import {
  GRID_LEVELS,
  GRID_MIN_SPACING_PX,
  GRID_MAX_SPACING_PX,
  GRID_FADE_IN_START,
  GRID_FADE_IN_RANGE,
  GRID_FADE_OUT_RANGE,
  GRID_MIN_ALPHA,
} from "@/features/board/constants/board.constant";
import { clamp } from "@engine/utils/math";
import { Camera } from "@engine/core/Camera";

// Рисует фоновую сетку через CSS background-image (linear-gradient), а не на канвасе.
// Каждый уровень дает пару градиентов: горизонтальные и вертикальные линии.
// При панорамировании обновляется только background-position (быстро), при изменении
// масштаба пересобираются все слои (applyFull).
export class GridRenderer {
  private container: HTMLDivElement;
  private camera: Camera;
  private raf = 0;
  private cachedZoom = NaN;
  private cachedSpacings: number[] = [];

  constructor(container: HTMLDivElement, camera: Camera) {
    this.container = container;
    this.camera = camera;
    this.applyFull();
  }

  // Отменяет запланированный кадр.
  destroy(): void {
    cancelAnimationFrame(this.raf);
  }

  // Полная пересборка слоёв сетки. Вычисляет видимость и alpha каждого уровня.
  applyFull(): void {
    const { x, y, zoom } = this.camera;
    const images: string[] = [];
    const bgSizes: string[] = [];
    const bgPositions: string[] = [];
    const spacings: number[] = [];

    for (let i = GRID_LEVELS.length - 1; i >= 0; i--) {
      const level = GRID_LEVELS[i];
      const screenSpacing = level.size * zoom;
      if (
        screenSpacing < GRID_MIN_SPACING_PX ||
        screenSpacing > GRID_MAX_SPACING_PX
      ) {
        continue;
      }

      // Плавный fade-in при увеличении расстояния и fade-out при дальнейшем разнесении.
      const tIn = clamp(
        (screenSpacing - GRID_FADE_IN_START) / GRID_FADE_IN_RANGE,
        0,
        1,
      );
      const tOut = clamp(
        (GRID_MAX_SPACING_PX - screenSpacing) / GRID_FADE_OUT_RANGE,
        0,
        1,
      );
      const alpha = tIn * tOut * level.maxAlpha;
      if (alpha < GRID_MIN_ALPHA) continue;

      const color = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
      const sizeStr = `${screenSpacing}px ${screenSpacing}px`;
      const positionStr = `${x % screenSpacing}px ${y % screenSpacing}px`;
      images.push(
        `linear-gradient(${color} 1px, transparent 1px)`,
        `linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      );
      bgSizes.push(sizeStr, sizeStr);
      bgPositions.push(positionStr, positionStr);
      spacings.push(screenSpacing, screenSpacing);
    }

    this.container.style.backgroundImage = images.join(", ") || "none";
    this.container.style.backgroundSize = bgSizes.join(", ");
    this.container.style.backgroundPosition = bgPositions.join(", ");
    this.cachedZoom = zoom;
    this.cachedSpacings = spacings;
  }

  // Лёгкое обновление при панорамировании. Если масштаб изменился, делает полную пересборку.
  applyPan(): void {
    const { x, y, zoom } = this.camera;
    if (zoom !== this.cachedZoom) {
      this.applyFull();
      return;
    }
    const spacings = this.cachedSpacings;
    if (spacings.length === 0) return;
    const positions = new Array<string>(spacings.length);
    for (let i = 0; i < spacings.length; i++) {
      const spacing = spacings[i];
      positions[i] = `${x % spacing}px ${y % spacing}px`;
    }
    this.container.style.backgroundPosition = positions.join(", ");
  }

  // Планирует обновление позиций сетки на следующий кадр.
  schedulePanRender(): void {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.applyPan());
  }

  // Планирует полную пересборку сетки на следующий кадр.
  scheduleZoomRender(): void {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.applyFull());
  }
}
