import { IGroupBbox } from "@engine/types";
import { hitTestElement, strokeIntersectsRect } from "@engine/utils/hit";
import { ElementStore } from "@engine/core/ElementStore";
import { Camera } from "@engine/core/Camera";
import {
  HANDLE_RADIUS,
  SELECTION_BORDER_COLOR,
  SELECTION_GROUP_BORDER_COLOR,
  SELECTION_HANDLE_FILL,
  SELECTION_HANDLE_STROKE,
  SELECTION_LINE_WIDTH,
} from "@/features/board/constants/board.constant";

interface IWorldBbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Управляет выделением элементов и рисует chrome (рамки, ручки) поверх канваса.
// _selectedIds  закреплённое выделение (после клика или окончания drag-rect).
// _previewIds   подсветка во время drag-rect, до отпускания мыши.
// Поля приватные. Снаружи доступны только через геттер selectedIds и методы класса.
export class SelectionManager {
  private _selectedIds = new Set<string>();
  private _previewIds = new Set<string>();

  private store: ElementStore;
  private renderFn: () => void = () => {};
  private readonly listeners = new Set<() => void>();

  constructor(store: ElementStore) {
    this.store = store;
  }

  // Readonly-вью на выделение. Менять состав можно только через методы класса.
  get selectedIds(): ReadonlySet<string> {
    return this._selectedIds;
  }

  // Назначает функцию запроса перерисовки канваса.
  setRenderFn(fn: () => void): void {
    this.renderFn = fn;
  }

  // Подписка на изменения _selectedIds. Возвращает функцию отписки.
  // preview/drag-rect промежуточные обновления НЕ нотифицируются —
  // только финализированные изменения выделения.
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  // Полностью заменяет выделение указанным набором id.
  replace(ids: Set<string>): void {
    this._selectedIds = ids;
    this.renderFn();
    this.notify();
  }

  // Добавляет id в выделение. Если он уже там, ничего не делает.
  add(id: string): void {
    if (this._selectedIds.has(id)) return;
    this._selectedIds.add(id);
    this.renderFn();
    this.notify();
  }

  // Убирает id из выделения. Если его не было, ничего не делает.
  unselect(id: string): void {
    if (!this._selectedIds.delete(id)) return;
    this.renderFn();
    this.notify();
  }

  // Убирает много id за один проход. Перерисовка только если что-то удалилось.
  unselectMany(ids: Iterable<string>): void {
    let changed = false;
    for (const id of ids) {
      if (this._selectedIds.delete(id)) changed = true;
    }
    if (changed) {
      this.renderFn();
      this.notify();
    }
  }

  // Закрепляет выделение по миро-прямоугольнику (или точке, если min == max).
  selectInRect(
    wMinX: number,
    wMinY: number,
    wMaxX: number,
    wMaxY: number,
  ): void {
    this._selectedIds = this.computeIds(wMinX, wMinY, wMaxX, wMaxY);
    this._previewIds = new Set();
    this.renderFn();
    this.notify();
  }

  // Подсвечивает кандидатов на выделение во время растягивания рамки.
  // Намеренно НЕ вызывает notify() — это transient state per pointer move,
  // подписчики наблюдают только финальное выделение.
  previewSelectInRect(
    wMinX: number,
    wMinY: number,
    wMaxX: number,
    wMaxY: number,
  ): void {
    this._selectedIds = new Set();
    this._previewIds = this.computeIds(wMinX, wMinY, wMaxX, wMaxY);
    this.renderFn();
  }

  // Сбрасывает выделение и preview.
  clearAll(): void {
    if (this._selectedIds.size === 0 && this._previewIds.size === 0) return;
    const hadSelected = this._selectedIds.size > 0;
    this._selectedIds = new Set();
    this._previewIds = new Set();
    this.renderFn();
    if (hadSelected) this.notify();
  }

  // Bounding box группы выделенных в экранных координатах.
  computeGroupBbox(cam: Camera): IGroupBbox | null {
    const bbox = this.computeWorldBbox();
    if (!bbox) return null;
    return {
      x: bbox.minX * cam.zoom + cam.x,
      y: bbox.minY * cam.zoom + cam.y,
      w: (bbox.maxX - bbox.minX) * cam.zoom,
      h: (bbox.maxY - bbox.minY) * cam.zoom,
    };
  }

  // Bounding box группы выделенных в мировых координатах.
  computeWorldGroupBbox(): IWorldBbox | null {
    return this.computeWorldBbox();
  }

  // Рисует все рамки выделения и ручки поверх канваса.
  drawChrome(ctx: CanvasRenderingContext2D, cam: Camera): void {
    this.drawSelectionChrome(ctx, cam, this._previewIds);
    this.drawSelectionChrome(ctx, cam, this._selectedIds);
  }

  // Рисует chrome для одного набора id (preview или selected).
  private drawSelectionChrome(
    ctx: CanvasRenderingContext2D,
    cam: Camera,
    ids: Set<string>,
  ): void {
    if (ids.size === 0) return;
    if (ids.size === 1 && this.isSingleConnector(ids)) return;

    ctx.save();
    ctx.strokeStyle = SELECTION_BORDER_COLOR;
    ctx.lineWidth = SELECTION_LINE_WIDTH;
    ctx.setLineDash([]);

    const bbox = this.drawElementBoxes(ctx, cam, ids);
    if (bbox) {
      const screen = this.toScreenRect(bbox, cam);
      if (ids.size > 1) this.drawGroupBox(ctx, screen);
      this.drawCornerHandles(ctx, screen);
    }
    ctx.restore();
  }

  // Рисует рамку вокруг каждого элемента в наборе. Возвращает общий bbox.
  private drawElementBoxes(
    ctx: CanvasRenderingContext2D,
    cam: Camera,
    ids: Set<string>,
  ): IWorldBbox | null {
    let gMinX = Infinity;
    let gMinY = Infinity;
    let gMaxX = -Infinity;
    let gMaxY = -Infinity;

    for (const id of ids) {
      const el = this.store.getById(id);
      if (!el?.bbox) continue;
      const { minX, minY, maxX, maxY } = el.bbox;
      const sx = minX * cam.zoom + cam.x;
      const sy = minY * cam.zoom + cam.y;
      const sw = (maxX - minX) * cam.zoom;
      const sh = (maxY - minY) * cam.zoom;
      ctx.strokeRect(sx, sy, sw, sh);
      if (minX < gMinX) gMinX = minX;
      if (minY < gMinY) gMinY = minY;
      if (maxX > gMaxX) gMaxX = maxX;
      if (maxY > gMaxY) gMaxY = maxY;
    }

    if (gMinX === Infinity) return null;
    return { minX: gMinX, minY: gMinY, maxX: gMaxX, maxY: gMaxY };
  }

  // Рамка вокруг группы выделенных (рисуется только при множественном выделении).
  private drawGroupBox(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; w: number; h: number },
  ): void {
    ctx.strokeStyle = SELECTION_GROUP_BORDER_COLOR;
    ctx.lineWidth = SELECTION_LINE_WIDTH;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  // Четыре ручки в углах группового bbox для resize-операций.
  private drawCornerHandles(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; w: number; h: number },
  ): void {
    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.w, y: rect.y },
      { x: rect.x, y: rect.y + rect.h },
      { x: rect.x + rect.w, y: rect.y + rect.h },
    ];
    for (const corner of corners) {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = SELECTION_HANDLE_FILL;
      ctx.fill();
      ctx.strokeStyle = SELECTION_HANDLE_STROKE;
      ctx.lineWidth = SELECTION_LINE_WIDTH;
      ctx.stroke();
    }
  }

  // Проходит по выделенным и собирает общий bbox в мировых координатах.
  private computeWorldBbox(): IWorldBbox | null {
    if (this._selectedIds.size === 0) return null;

    let gMinX = Infinity;
    let gMinY = Infinity;
    let gMaxX = -Infinity;
    let gMaxY = -Infinity;

    for (const id of this._selectedIds) {
      const el = this.store.getById(id);
      if (!el?.bbox) continue;
      const { minX, minY, maxX, maxY } = el.bbox;
      if (minX < gMinX) gMinX = minX;
      if (minY < gMinY) gMinY = minY;
      if (maxX > gMaxX) gMaxX = maxX;
      if (maxY > gMaxY) gMaxY = maxY;
    }

    if (gMinX === Infinity) return null;
    return { minX: gMinX, minY: gMinY, maxX: gMaxX, maxY: gMaxY };
  }

  // Перевод миро-bbox в экранный прямоугольник (x, y, ширина, высота).
  private toScreenRect(
    bbox: IWorldBbox,
    cam: Camera,
  ): { x: number; y: number; w: number; h: number } {
    return {
      x: bbox.minX * cam.zoom + cam.x,
      y: bbox.minY * cam.zoom + cam.y,
      w: (bbox.maxX - bbox.minX) * cam.zoom,
      h: (bbox.maxY - bbox.minY) * cam.zoom,
    };
  }

  // Если выделен ровно один коннектор, его рамка не рисуется (некрасивая).
  private isSingleConnector(ids: Set<string>): boolean {
    const [singleId] = [...ids];
    const el = this.store.getById(singleId);
    return el?.type === "connector";
  }

  // Вычисляет id элементов, попавших в прямоугольник (или точку).
  private computeIds(
    wMinX: number,
    wMinY: number,
    wMaxX: number,
    wMaxY: number,
  ): Set<string> {
    const ids = new Set<string>();
    const isPoint = wMinX === wMaxX && wMinY === wMaxY;

    if (isPoint) {
      const all = this.store.getAll();
      for (let i = all.length - 1; i >= 0; i--) {
        if (hitTestElement(wMinX, wMinY, all[i], this.store)) {
          ids.add(all[i].id);
          break;
        }
      }
    } else {
      for (const el of this.store.queryRect(wMinX, wMinY, wMaxX, wMaxY)) {
        if (strokeIntersectsRect(el, wMinX, wMinY, wMaxX, wMaxY, this.store))
          ids.add(el.id);
      }
    }
    return ids;
  }
}
