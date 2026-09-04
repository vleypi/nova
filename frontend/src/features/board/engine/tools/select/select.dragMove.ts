import { IPoint, THistoryEntry } from "@engine/types";
import { getHandler } from "@engine/elements/element-registry";
import { refreshConnectorBboxes } from "@engine/utils/connector-refresh";
import { ElementStore } from "@engine/core/ElementStore";
import { SelectionManager } from "@engine/selection/SelectionManager";
import { BoardRenderer } from "@engine/renderer/BoardRenderer";
import { SelectDragBase } from "./select.dragBase";

// Управляет перемещением выделенных элементов при drag-move.
export class SelectDragMove extends SelectDragBase {
  private dragStartWorld: IPoint = { x: 0, y: 0 };

  constructor(
    store: ElementStore,
    selection: SelectionManager,
    renderer: BoardRenderer,
    pushHistory: (entry: THistoryEntry) => void,
    private container: HTMLDivElement,
  ) {
    super(store, selection, renderer, pushHistory);
  }

  // Начинает drag-move: фиксирует стартовую точку и снапшот элементов.
  begin(world: IPoint): void {
    this.active = true;
    this.dragStartWorld = world;
    this.dragSnapshot = this.takeDragSnapshot();
    this.container.style.cursor = "grabbing";
  }

  // Применяет смещение от стартовой точки и перерисовывает кадр.
  update(world: IPoint): void {
    this.applyMove(
      world.x - this.dragStartWorld.x,
      world.y - this.dragStartWorld.y,
    );
    this.renderer.rebuildBuffer();
    this.renderer.renderFrame();
  }

  // Завершает drag-move и записывает изменения в историю.
  end(): void {
    this.active = false;
    this.container.style.cursor = "";
    const changes = this.buildChanges();
    this.resetDragState();
    if (changes.length > 0) this.pushHistory({ type: "move", changes });
    this.renderer.renderFrame();
  }

  // Отменяет drag-move без записи в историю.
  cancel(): void {
    this.active = false;
    this.container.style.cursor = "";
    this.resetDragState();
  }

  private applyMove(dx: number, dy: number): void {
    for (const snapshot of this.dragSnapshot) {
      const element = this.store.getById(snapshot.id);
      if (!element) continue;
      getHandler(element.type).applyMove(element, snapshot.data, dx, dy);
      this.store.reindex(element.id);
    }
    refreshConnectorBboxes(this.store, this.dragMovedIds);
  }
}
