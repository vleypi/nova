import RBush from "rbush";
import { IConnectorElement, IElement } from "@engine/types";
import { hitTestElement } from "@engine/utils/hit";
import type { ImageCache } from "@engine/image/ImageCache";

interface ISpatialEntry {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  el: IElement;
}

// Подкласс RBush для типобезопасной работы с ISpatialEntry.
class ElementRBush extends RBush<ISpatialEntry> {
  toBBox(e: ISpatialEntry): ISpatialEntry {
    return e;
  }
  compareMinX(a: ISpatialEntry, b: ISpatialEntry): number {
    return a.minX - b.minX;
  }
  compareMinY(a: ISpatialEntry, b: ISpatialEntry): number {
    return a.minY - b.minY;
  }
}

// Слушатель удаления одного элемента. Получает элемент в виде, в котором он
// лежал в сторе непосредственно перед удалением.
type TElementRemovedListener = (el: IElement) => void;

// Хранилище всех элементов доски. Под капотом несколько индексов для быстрых
// выборок: spatial-дерево для прямоугольных запросов и пара Map'ов по id и типу.
export class ElementStore {
  // Защита от prototype pollution в update().
  private static readonly FORBIDDEN_KEYS = new Set([
    "__proto__",
    "constructor",
    "prototype",
  ]);

  private elements: IElement[] = [];
  private hiddenIds = new Set<string>();
  private byId = new Map<string, IElement>();
  private byType = new Map<IElement["type"], Set<string>>();
  private spatial = new ElementRBush();
  private spatialEntries = new Map<string, ISpatialEntry>();
  private removalListeners = new Set<TElementRemovedListener>();
  private imageCache: ImageCache | null = null;

  // Назначает per-engine кеш картинок. Зовётся из BoardEngine.buildRendering.
  // Handler-ы получают его через resolver.
  setImageCache(cache: ImageCache | null): void {
    this.imageCache = cache;
  }

  // Возвращает текущий кеш картинок или null.
  getImageCache(): ImageCache | null {
    return this.imageCache;
  }

  // Подписка на удаление элементов. Возвращает функцию отписки.
  // Через неё handler-ы чистят свои кеши, а core остаётся type-agnostic.
  onElementRemoved(listener: TElementRemovedListener): () => void {
    this.removalListeners.add(listener);
    return () => {
      this.removalListeners.delete(listener);
    };
  }

  // Добавляет один элемент в конец массива и индексы.
  add(el: IElement): void {
    this.elements.push(el);
    this.addIndices(el);
  }

  // Bulk-добавление с пакетной загрузкой в spatial index.
  addMany(els: IElement[]): void {
    this.elements.push(...els);
    this.bulkIndex(els);
  }

  // Удаляет элемент по id и чистит все связанные индексы и кеши.
  remove(id: string): void {
    const el = this.byId.get(id);
    this.hiddenIds.delete(id);
    if (!el) return;
    const idx = this.elements.indexOf(el);
    if (idx !== -1) this.elements.splice(idx, 1);
    this.removeIndices(el);
    this.notifyRemoved(el);
  }

  // Bulk-удаление по набору id.
  removeMany(ids: Set<string>): void {
    const removed: IElement[] = [];
    for (const id of ids) {
      const el = this.byId.get(id);
      if (el) removed.push(el);
    }
    this.elements = this.elements.filter((el) => !ids.has(el.id));
    for (const el of removed) {
      this.hiddenIds.delete(el.id);
      this.removeIndices(el);
    }
    for (const el of removed) this.notifyRemoved(el);
  }

  // Помечает элемент скрытым (исключается из getAll/queryRect).
  // Используется при инлайн-редактировании, чтобы не дублировать оверлей и канвас.
  hide(id: string): void {
    this.hiddenIds.add(id);
  }

  // Снимает флаг скрытости.
  unhide(id: string): void {
    this.hiddenIds.delete(id);
  }

  // Применяет partial-патч к элементу. Защищён от prototype pollution.
  // После апдейта переиндексирует элемент в spatial index (bbox мог измениться).
  update(id: string, patch: Record<string, unknown>): void {
    const el = this.byId.get(id);
    if (!el) return;
    for (const key of Object.keys(patch)) {
      if (ElementStore.FORBIDDEN_KEYS.has(key)) continue;
      (el as unknown as Record<string, unknown>)[key] = patch[key];
    }
    this.reindex(id);
  }

  // Все видимые элементы. Если скрытых нет, возвращает внутренний массив без копирования.
  getAll(): readonly IElement[] {
    if (this.hiddenIds.size === 0) return this.elements;
    return this.elements.filter((el) => !this.hiddenIds.has(el.id));
  }

  // Поиск элемента по id.
  getById(id: string): IElement | undefined {
    return this.byId.get(id);
  }

  // Полная замена содержимого. Используется при загрузке состояния доски с сервера.
  setAll(els: IElement[]): void {
    this.elements = els;
    this.byId.clear();
    this.byType.clear();
    this.spatial.clear();
    this.spatialEntries.clear();
    this.bulkIndex(els);
  }

  // Существует ли элемент с таким id.
  has(id: string): boolean {
    return this.byId.has(id);
  }

  // Полная очистка стора и всех индексов.
  clear(): void {
    const cleared = this.elements;
    this.elements = [];
    this.byId.clear();
    this.byType.clear();
    this.spatial.clear();
    this.spatialEntries.clear();
    for (const el of cleared) this.notifyRemoved(el);
  }

  // Находит верхний элемент в точке (worldX, worldY) и удаляет его.
  // Обход с конца: позже добавленные элементы рисуются поверх и должны стираться первыми.
  eraseAt(worldX: number, worldY: number): IElement | null {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      if (hitTestElement(worldX, worldY, this.elements[i], this)) {
        const [removed] = this.elements.splice(i, 1);
        this.removeIndices(removed);
        this.notifyRemoved(removed);
        return removed;
      }
    }
    return null;
  }

  // Все элементы, чей bbox пересекает прямоугольник, через RBush.
  queryRect(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): IElement[] {
    const hits = this.spatial.search({ minX, minY, maxX, maxY });
    if (this.hiddenIds.size === 0) {
      const out: IElement[] = new Array(hits.length);
      for (let i = 0; i < hits.length; i++) out[i] = hits[i].el;
      return out;
    }
    const out: IElement[] = [];
    for (const e of hits) if (!this.hiddenIds.has(e.el.id)) out.push(e.el);
    return out;
  }

  // Все коннекторы (опционально с учётом скрытых).
  getConnectors(includeHidden = false): IConnectorElement[] {
    const ids = this.byType.get("connector");
    if (!ids) return [];
    const out: IConnectorElement[] = [];
    for (const id of ids) {
      if (!includeHidden && this.hiddenIds.has(id)) continue;
      const el = this.byId.get(id);
      if (el && el.type === "connector") out.push(el);
    }
    return out;
  }

  // Пересоздаёт spatial-entry для элемента (после изменения bbox).
  reindex(id: string): void {
    const el = this.byId.get(id);
    if (!el) return;
    this.removeFromIndex(id);
    this.insertIntoIndex(el);
  }

  // Заполняет все индексы за один проход и пакетно грузит spatial-дерево.
  private bulkIndex(els: IElement[]): void {
    const batch: ISpatialEntry[] = [];
    for (const el of els) {
      this.byId.set(el.id, el);
      this.addToTypeIndex(el);
      if (!el.bbox) continue;
      const entry: ISpatialEntry = {
        minX: el.bbox.minX,
        minY: el.bbox.minY,
        maxX: el.bbox.maxX,
        maxY: el.bbox.maxY,
        el,
      };
      batch.push(entry);
      this.spatialEntries.set(el.id, entry);
    }
    if (batch.length > 0) this.spatial.load(batch);
  }

  // Уведомляет слушателей об удалении элемента.
  private notifyRemoved(el: IElement): void {
    for (const listener of this.removalListeners) listener(el);
  }

  // Добавляет элемент во все индексы.
  private addIndices(el: IElement): void {
    this.byId.set(el.id, el);
    this.addToTypeIndex(el);
    this.insertIntoIndex(el);
  }

  // Удаляет элемент из всех индексов.
  private removeIndices(el: IElement): void {
    this.byId.delete(el.id);
    this.byType.get(el.type)?.delete(el.id);
    this.removeFromIndex(el.id);
  }

  // Группирует id по типу. Set для нового типа создаётся лениво.
  private addToTypeIndex(el: IElement): void {
    let set = this.byType.get(el.type);
    if (!set) {
      set = new Set();
      this.byType.set(el.type, set);
    }
    set.add(el.id);
  }

  // Кладёт элемент в spatial-дерево. Без bbox не индексируем.
  private insertIntoIndex(el: IElement): void {
    if (!el.bbox) return;
    const entry: ISpatialEntry = {
      minX: el.bbox.minX,
      minY: el.bbox.minY,
      maxX: el.bbox.maxX,
      maxY: el.bbox.maxY,
      el,
    };
    this.spatial.insert(entry);
    this.spatialEntries.set(el.id, entry);
  }

  // Убирает запись элемента из spatial-дерева.
  private removeFromIndex(id: string): void {
    const entry = this.spatialEntries.get(id);
    if (!entry) return;
    this.spatial.remove(entry);
    this.spatialEntries.delete(id);
  }
}
