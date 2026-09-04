import {
  IElementChange,
  IElementSnapshot,
  THistoryEntry,
} from "@engine/types";
import { getHandler } from "@engine/elements/element-registry";
import { ElementStore } from "@engine/core/ElementStore";
import { SelectionManager } from "@engine/selection/SelectionManager";
import { BoardRenderer } from "@engine/renderer/BoardRenderer";

// Базовый класс drag-операций с выделением (move, resize).
// Держит общее состояние и хелперы снапшотов/историй; подклассы реализуют
// свои begin/update/end/cancel и специфичную математику.
export abstract class SelectDragBase {
  protected active = false;
  protected dragSnapshot: IElementSnapshot[] = [];
  protected dragMovedIds: Set<string> = new Set();

  constructor(
    protected store: ElementStore,
    protected selection: SelectionManager,
    protected renderer: BoardRenderer,
    protected pushHistory: (entry: THistoryEntry) => void,
  ) {}

  // True если drag-операция сейчас активна.
  isActive(): boolean {
    return this.active;
  }

  // Снимает снимки всех выделенных элементов и запоминает их id.
  // Снимки нужны для последующего applyMove/applyResize и записи истории.
  protected takeDragSnapshot(): IElementSnapshot[] {
    const snapshots = this.store
      .getAll()
      .filter((element) => this.selection.selectedIds.has(element.id))
      .map((element) => ({
        id: element.id,
        data: getHandler(element.type).takeSnapshot(element),
      }));
    this.dragMovedIds = new Set(snapshots.map((snapshot) => snapshot.id));
    return snapshots;
  }

  // Строит список изменений для записи в историю: пары (старый снимок, новый снимок).
  protected buildChanges(): IElementChange[] {
    return this.dragSnapshot.map((snapshot) => {
      const element = this.store.getById(snapshot.id);
      return {
        id: snapshot.id,
        oldData: snapshot.data,
        newData: element
          ? getHandler(element.type).takeSnapshot(element)
          : snapshot.data,
      };
    });
  }

  // Сбрасывает накопленный снапшот и список затронутых id.
  protected resetDragState(): void {
    this.dragSnapshot = [];
    this.dragMovedIds = new Set();
  }
}
