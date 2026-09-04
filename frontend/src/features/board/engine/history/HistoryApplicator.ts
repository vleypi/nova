import { IElementChange, THistoryEntry } from "@engine/types";
import { getHandler } from "@engine/elements/element-registry";
import { ElementStore } from "@engine/core/ElementStore";
import { SelectionManager } from "@engine/selection/SelectionManager";
import { BoardRenderer } from "@engine/renderer/BoardRenderer";
import { refreshConnectorBboxes } from "@engine/utils/connector-refresh";

// Применяет записи истории к стору, выделению и рендереру.
// Знает семантику каждого типа THistoryEntry и обратное к нему действие.
export class HistoryApplicator {
  constructor(
    private store: ElementStore,
    private selection: SelectionManager,
    private renderer: BoardRenderer,
  ) {}

  // Откатывает действие: для каждого типа entry применяет обратную операцию.
  applyUndo(entry: THistoryEntry): void {
    switch (entry.type) {
      // Был add (рисование) -> убираем элемент.
      case "draw":
        this.store.remove(entry.element.id);
        this.selection.unselect(entry.element.id);
        refreshConnectorBboxes(this.store, new Set([entry.element.id]));
        break;

      // Был erase (стирание) -> возвращаем все элементы обратно.
      case "erase": {
        this.store.addMany(entry.elements);
        refreshConnectorBboxes(
          this.store,
          new Set(entry.elements.map((el) => el.id)),
        );
        break;
      }

      // Были move/resize/edit -> восстанавливаем старые снимки элементов.
      case "move":
      case "resize":
      case "edit":
        this.restoreSnapshots(entry.changes, "undo");
        break;

      // Был paste -> убираем вставленные и чистим из них selection.
      case "paste": {
        const ids = new Set(entry.elements.map((el) => el.id));
        this.store.removeMany(ids);
        this.selection.unselectMany(ids);
        refreshConnectorBboxes(this.store, ids);
        break;
      }

      // AI-сгенерированная пачка create-операций -> удаляем все элементы группы.
      case "ai-create": {
        const idArr = entry.elements.map((el) => el.id);
        const ids = new Set(idArr);
        this.store.removeMany(ids);
        this.selection.unselectMany(ids);
        this.renderer.cancelAiFades(idArr);
        refreshConnectorBboxes(this.store, ids);
        break;
      }
    }
    this.rerender();
  }

  // Повторяет ранее откатанное действие: применяет прямую операцию.
  applyRedo(entry: THistoryEntry): void {
    switch (entry.type) {
      // Возвращаем нарисованный элемент.
      case "draw":
        this.store.add(entry.element);
        refreshConnectorBboxes(this.store, new Set([entry.element.id]));
        break;

      // Снова стираем элементы и убираем их из selection.
      case "erase": {
        const ids = new Set(entry.elements.map((el) => el.id));
        this.store.removeMany(ids);
        this.selection.unselectMany(ids);
        refreshConnectorBboxes(this.store, ids);
        break;
      }

      // Накатываем новые снимки элементов.
      case "move":
      case "resize":
      case "edit":
        this.restoreSnapshots(entry.changes, "redo");
        break;

      // Снова вставляем элементы и делаем их выделением.
      case "paste": {
        this.store.addMany(entry.elements);
        const ids = new Set(entry.elements.map((el) => el.id));
        this.selection.replace(ids);
        refreshConnectorBboxes(this.store, ids);
        break;
      }

      // AI-сгенерированная пачка create -> восстанавливаем все элементы группы.
      case "ai-create": {
        this.store.addMany(entry.elements);
        const ids = new Set(entry.elements.map((el) => el.id));
        refreshConnectorBboxes(this.store, ids);
        break;
      }
    }
    this.rerender();
  }

  // Восстанавливает снимки элементов в нужном направлении.
  // direction = "undo" применяет oldData, "redo" применяет newData.
  private restoreSnapshots(
    changes: IElementChange[],
    direction: "undo" | "redo",
  ): void {
    const touchedIds = new Set<string>();
    for (const change of changes) {
      const el = this.store.getById(change.id);
      if (!el) continue;
      const data = direction === "undo" ? change.oldData : change.newData;
      getHandler(el.type).restoreSnapshot(el, data);
      this.store.reindex(el.id);
      touchedIds.add(change.id);
    }
    refreshConnectorBboxes(this.store, touchedIds);
  }

  // Перестраивает буфер и перерисовывает кадр после применения изменений.
  private rerender(): void {
    this.renderer.rebuildBuffer();
    this.renderer.renderFrame();
  }
}
