import {
  IGroupBbox,
  IPoint,
  IStrokeBbox,
  THistoryEntry,
} from "@engine/types";
import { getHandler } from "@engine/elements/element-registry";
import { refreshConnectorBboxes } from "@engine/utils/connector-refresh";
import { ElementStore } from "@engine/core/ElementStore";
import { SelectionManager } from "@engine/selection/SelectionManager";
import { BoardRenderer } from "@engine/renderer/BoardRenderer";
import { Camera } from "@engine/core/Camera";
import { RESIZE_MIN_DELTA_THRESHOLD } from "@/features/board/constants/board.constant";
import { screenGroupBboxToWorld } from "./select.hit";
import { SelectDragBase } from "./select.dragBase";

// Управляет drag-resize выделенных элементов через угловые handle-точки.
export class SelectDragResize extends SelectDragBase {
  private resizeHandleIndex = 0;
  private dragOriginalWorldBbox: IStrokeBbox | null = null;

  constructor(
    store: ElementStore,
    selection: SelectionManager,
    renderer: BoardRenderer,
    pushHistory: (entry: THistoryEntry) => void,
    private camera: Camera,
  ) {
    super(store, selection, renderer, pushHistory);
  }

  // Начинает drag-resize: фиксирует handle-индекс и начальный bbox.
  begin(handleIndex: number, groupBbox: IGroupBbox): void {
    this.active = true;
    this.resizeHandleIndex = handleIndex;
    this.dragSnapshot = this.takeDragSnapshot();
    this.dragOriginalWorldBbox = screenGroupBboxToWorld(this.camera, groupBbox);
  }

  // Обновляет масштаб элементов под текущую позицию курсора в мировых координатах.
  update(worldPoint: IPoint): void {
    this.applyResize(worldPoint);
    this.renderer.rebuildBuffer();
    this.renderer.renderFrame();
  }

  // Завершает drag-resize и записывает изменения в историю.
  end(): void {
    this.active = false;
    this.dragOriginalWorldBbox = null;
    const changes = this.buildChanges();
    this.resetDragState();
    if (changes.length > 0) this.pushHistory({ type: "resize", changes });
    this.renderer.renderFrame();
  }

  // Отменяет drag-resize без записи в историю.
  cancel(): void {
    this.active = false;
    this.dragOriginalWorldBbox = null;
    this.resetDragState();
  }

  private applyResize(cursorWorld: IPoint): void {
    const worldBbox = this.dragOriginalWorldBbox;
    if (!worldBbox) return;

    const handleIndex = this.resizeHandleIndex;
    const anchorX = handleIndex === 0 || handleIndex === 2 ? worldBbox.maxX : worldBbox.minX;
    const anchorY = handleIndex === 0 || handleIndex === 1 ? worldBbox.maxY : worldBbox.minY;
    const originalMovingX = handleIndex === 0 || handleIndex === 2 ? worldBbox.minX : worldBbox.maxX;
    const originalMovingY = handleIndex === 0 || handleIndex === 1 ? worldBbox.minY : worldBbox.maxY;
    const originalDeltaX = originalMovingX - anchorX;
    const originalDeltaY = originalMovingY - anchorY;

    const scaleX =
      Math.abs(originalDeltaX) < RESIZE_MIN_DELTA_THRESHOLD
        ? 1
        : (cursorWorld.x - anchorX) / originalDeltaX;
    const scaleY =
      Math.abs(originalDeltaY) < RESIZE_MIN_DELTA_THRESHOLD
        ? 1
        : (cursorWorld.y - anchorY) / originalDeltaY;
    const avgScale = Math.sqrt(Math.abs(scaleX * scaleY));

    for (const snapshot of this.dragSnapshot) {
      const element = this.store.getById(snapshot.id);
      if (!element) continue;
      const handler = getHandler(element.type);
      handler.applyResize(
        element,
        snapshot.data,
        anchorX,
        anchorY,
        scaleX,
        scaleY,
        avgScale,
      );
      // Источник истины для bbox: applyResize мог поставить slot, computeBbox
      // даёт тип-специфичный реальный bbox (для image это видимый rect, для
      // sticky подстраивает auto font size под новый размер).
      handler.computeBbox(element, this.store);
      this.store.reindex(element.id);
    }
    refreshConnectorBboxes(this.store, this.dragMovedIds);
  }
}
