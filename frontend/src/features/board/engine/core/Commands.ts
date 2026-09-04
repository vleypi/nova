import { IElement, THistoryEntry } from "@engine/types";
import { ElementStore } from "@engine/core/ElementStore";
import { SelectionManager } from "@engine/selection/SelectionManager";
import { BoardRenderer } from "@engine/renderer/BoardRenderer";
import { refreshConnectorBboxes } from "@engine/utils/connector-refresh";

export interface ICommandsDeps {
  store: ElementStore;
  selection: SelectionManager;
  renderer: BoardRenderer;
  pushHistory: (entry: THistoryEntry) => void;
}

// Единая точка для стандартных мутаций доски: атомарно делает store-апдейт,
// дорисовку в буфер рендерера, push в историю (которая эмитит в сокет) и render.
// Заменяет повторяющийся boilerplate в тулах и пайплайнах создания/удаления.
// Каждый шаг обязателен — пропуск любого даёт визуальный или sync-баг,
// поэтому собран в одном месте и протестируется один раз.
export class Commands {
  constructor(private readonly deps: ICommandsDeps) {}

  // Создаёт один элемент и пушит "draw"-запись истории.
  // Selection не трогается — caller решает, надо ли выделять созданное.
  createElement(el: IElement): void {
    this.deps.store.add(el);
    this.deps.renderer.addElementToBuffer(el);
    this.deps.pushHistory({ type: "draw", element: el });
    this.deps.renderer.renderFrame();
  }

  // Создаёт несколько элементов одной "paste"-записью истории (для копи-паста доски).
  // Selection не трогается — caller (обычно PasteHandler) сам делает selection.replace.
  createElementsAsPaste(elements: IElement[]): void {
    if (elements.length === 0) return;
    for (const el of elements) {
      this.deps.store.add(el);
      this.deps.renderer.addElementToBuffer(el);
    }
    this.deps.pushHistory({ type: "paste", elements });
    this.deps.renderer.renderFrame();
  }

  // Удаляет несколько элементов одной "erase"-записью истории.
  // Чистит выделение и переиндексирует bbox коннекторов, чьи анкоры указывали
  // на удалённые элементы — иначе их bbox в RBush остался бы прежним.
  deleteElements(elements: IElement[]): void {
    if (elements.length === 0) return;
    const ids = new Set(elements.map((el) => el.id));
    this.deps.store.removeMany(ids);
    this.deps.selection.unselectMany(ids);
    refreshConnectorBboxes(this.deps.store, ids);
    this.deps.pushHistory({ type: "erase", elements });
    this.deps.renderer.rebuildBuffer();
    this.deps.renderer.renderFrame();
  }

  // Применяет partial-патч к элементу и пушит "edit"-запись истории.
  // Снимки old/new передаются caller-ом, потому что old должен сниматься ДО мутации,
  // а new — после (либо собран mерджем). Refresh коннекторов на случай если патч
  // изменил геометрию (x/y/width/height/anchor).
  updateElement(
    id: string,
    patch: Record<string, unknown>,
    oldData: object,
    newData: object,
  ): void {
    this.deps.store.update(id, patch);
    refreshConnectorBboxes(this.deps.store, new Set([id]));
    this.deps.pushHistory({
      type: "edit",
      changes: [{ id, oldData, newData }],
    });
    this.deps.renderer.rebuildBuffer();
    this.deps.renderer.renderFrame();
  }
}
