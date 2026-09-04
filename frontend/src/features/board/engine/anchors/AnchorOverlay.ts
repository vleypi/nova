import type { IElement, IPoint, TAnchorSide } from "@engine/types";
import { Camera } from "@engine/core/Camera";
import { ElementStore } from "@engine/core/ElementStore";
import { SelectionManager } from "@engine/selection/SelectionManager";
import { BoardRenderer } from "@engine/renderer/BoardRenderer";
import { getElementAnchors, SIDE_NORMALS } from "@engine/utils/anchors";
import {
  ANCHOR_RADIUS,
  ANCHOR_HIT_RADIUS,
  ANCHOR_PAD_PX,
  ANCHOR_FILL,
  ANCHOR_STROKE,
  ANCHOR_LINE_WIDTH,
} from "@/features/board/constants/board.constant";

// Режим отображения якорей:
//   off            якоря не показываются и не хитятся;
//   selectOnly     показываем только на единственном выделенном элементе;
//   selectAndHover дополнительно показываем на наведённом элементе (для создания коннектора).
export type TAnchorMode = "off" | "selectOnly" | "selectAndHover";

// Результат hit-test по якорю: какой элемент и какая сторона.
export interface IAnchorHit {
  elementId: string;
  side: TAnchorSide;
  pos: IPoint;
}

const SIDES: TAnchorSide[] = ["top", "right", "bottom", "left"];

// Оверлей якорей привязки. Рисует точки на 4 сторонах элемента и обрабатывает
// hit-test для перетаскивания endpoint'ов коннектора. Сам не слушает pointer:
// hit-test вызывается из SelectTool/select.connector по запросу.
export class AnchorOverlay {
  private readonly camera: Camera;
  private readonly store: ElementStore;
  private readonly selection: SelectionManager;
  private readonly renderer: BoardRenderer;

  private mode: TAnchorMode = "off";
  private hoveredId: string | null = null;
  private disposeDrawer: (() => void) | null = null;

  constructor(deps: {
    camera: Camera;
    store: ElementStore;
    selection: SelectionManager;
    renderer: BoardRenderer;
  }) {
    this.camera = deps.camera;
    this.store = deps.store;
    this.selection = deps.selection;
    this.renderer = deps.renderer;
  }

  // Подписывается на screen-drawer рендерера, чтобы рисовать якоря поверх chrome.
  attach(): void {
    if (this.disposeDrawer) return;
    this.disposeDrawer = this.renderer.addScreenDrawer((ctx, cam) =>
      this.draw(ctx, cam),
    );
  }

  detach(): void {
    this.disposeDrawer?.();
    this.disposeDrawer = null;
  }

  // Меняет режим отображения. Перерисовывает кадр если режим действительно изменился.
  setMode(mode: TAnchorMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.scheduleRender();
  }

  getMode(): TAnchorMode {
    return this.mode;
  }

  // Назначает hovered элемент. Перерисовка только в режиме selectAndHover.
  setHoveredElement(id: string | null): void {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    if (this.mode === "selectAndHover") this.scheduleRender();
  }

  // Hit-test по экранной точке. Возвращает попавший якорь или null.
  hitAnchor(screenX: number, screenY: number): IAnchorHit | null {
    if (this.mode === "off") return null;
    const radiusSq = ANCHOR_HIT_RADIUS * ANCHOR_HIT_RADIUS;
    for (const el of this.getVisibleElements()) {
      const anchors = getElementAnchors(el);
      if (!anchors) continue;
      for (const side of SIDES) {
        const p = anchors[side];
        const { sx, sy } = this.toAnchorScreenPos(p, side, this.camera);
        const dx = screenX - sx;
        const dy = screenY - sy;
        if (dx * dx + dy * dy <= radiusSq) {
          return { elementId: el.id, side, pos: p };
        }
      }
    }
    return null;
  }

  // Полная очистка: отписка от рендерера, сброс состояния.
  destroy(): void {
    this.detach();
    this.hoveredId = null;
    this.mode = "off";
  }

  // Рендер якорей: круг с заливкой и обводкой на сдвинутой от стороны позиции.
  private draw(ctx: CanvasRenderingContext2D, cam: Camera): void {
    if (this.mode === "off") return;
    ctx.fillStyle = ANCHOR_FILL;
    ctx.strokeStyle = ANCHOR_STROKE;
    ctx.lineWidth = ANCHOR_LINE_WIDTH;
    for (const el of this.getVisibleElements()) {
      const anchors = getElementAnchors(el);
      if (!anchors) continue;
      for (const side of SIDES) {
        const p = anchors[side];
        const { sx, sy } = this.toAnchorScreenPos(p, side, cam);
        ctx.beginPath();
        ctx.arc(sx, sy, ANCHOR_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  // Конвертирует мировую точку якоря в экранную с учётом сдвига по нормали стороны.
  private toAnchorScreenPos(
    p: IPoint,
    side: TAnchorSide,
    cam: Camera,
  ): { sx: number; sy: number } {
    const normal = SIDE_NORMALS[side];
    const base = cam.worldToScreen(p.x, p.y);
    return {
      sx: base.sx + normal.x * ANCHOR_PAD_PX,
      sy: base.sy + normal.y * ANCHOR_PAD_PX,
    };
  }

  // Какие элементы показывают якоря: единственный выделенный (не connector)
  // и опционально hovered (в режиме selectAndHover, если он не тот же).
  private *getVisibleElements(): IterableIterator<IElement> {
    const sel = this.selection.selectedIds;
    let selectedSingleId: string | null = null;
    if (sel.size === 1) {
      const [id] = [...sel];
      const el = this.store.getById(id);
      if (el && el.type !== "connector") {
        selectedSingleId = id;
        yield el;
      }
    }
    if (
      this.mode === "selectAndHover" &&
      this.hoveredId &&
      this.hoveredId !== selectedSingleId
    ) {
      const el = this.store.getById(this.hoveredId);
      if (el && el.type !== "connector") yield el;
    }
  }

  private scheduleRender(): void {
    this.renderer.scheduleRender();
  }
}
