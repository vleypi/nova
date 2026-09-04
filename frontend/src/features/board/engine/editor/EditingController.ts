import { IElement, THistoryEntry, TShapeKind } from "@engine/types";
import { Camera } from "@engine/core/Camera";
import { Commands } from "@engine/core/Commands";
import { ContainerRect } from "@engine/core/ContainerRect";
import { ElementStore } from "@engine/core/ElementStore";
import { SelectionManager } from "@engine/selection/SelectionManager";
import { BoardRenderer } from "@engine/renderer/BoardRenderer";
import { getHandler } from "@engine/elements/element-registry";
import {
  isEditableHandler,
  IEditableElementHandler,
  IEditableContent,
} from "@engine/elements/interfaces/editable-element-handler";
import {
  TextEditorOverlay,
  IShapeContainerMode,
  IStickyContainerMode,
} from "./TextEditorOverlay";
import { DEFAULT_STROKE_COLOR } from "@/features/board/constants/board.constant";

export interface IEditingControllerDeps {
  container: HTMLDivElement;
  containerRect: ContainerRect;
  camera: Camera;
  store: ElementStore;
  selection: SelectionManager;
  renderer: BoardRenderer;
  commands: Commands;
  pushHistory: (entry: THistoryEntry) => void;
  // Эмитится при изменении состояния editing (open / commit / cancel / destroy).
  // Используется SelectionToolbar чтобы скрываться во время inline-редактирования.
  onEditingChange?: (editing: boolean) => void;
}

// Координирует inline-редактирование: открытие overlay, commit/cancel,
// интеграцию с историей и store. Гарантирует один активный overlay.
export class EditingController {
  private editingId: string | null = null;
  private isExisting = false;
  private editingEl: IElement | null = null;
  private snapshot: unknown | null = null;
  private pendingPatch: Record<string, unknown> = {};
  private overlay: TextEditorOverlay | null = null;
  // Ghost-drawer: handler.drawDuringEdit рисует элемент без текста под прозрачным
  // editor-div, чтобы у не-rect фигур (ellipse/diamond/triangle) был виден реальный контур.
  private disposeGhostDrawer: (() => void) | null = null;
  // Идемпотентность для onEditingChange: эмитим только при реальном переходе.
  private lastEmittedEditing = false;

  constructor(private deps: IEditingControllerDeps) {}

  private emitEditingIfChanged(): void {
    const now = this.editingId !== null;
    if (now === this.lastEmittedEditing) return;
    this.lastEmittedEditing = now;
    this.deps.onEditingChange?.(now);
  }

  // Активна ли сейчас сессия редактирования.
  isEditing(): boolean {
    return this.editingId !== null;
  }

  // ID элемента, который сейчас редактируется, или null.
  getEditingId(): string | null {
    return this.editingId;
  }

  // Открывает inline-редактор для элемента. Если уже открыт, финализирует предыдущий.
  openEdit(el: IElement): void {
    const handler = getHandler(el.type);
    if (!isEditableHandler(handler)) {
      throw new Error(`type ${el.type} is not editable`);
    }

    // Если уже есть активный overlay, синхронно финализируем его.
    if (this.overlay) {
      const previous = this.overlay;
      previous.finalize();
      this.resetState();
    }

    const isExisting = this.deps.store.has(el.id);
    this.editingId = el.id;
    this.isExisting = isExisting;
    this.editingEl = el;
    this.pendingPatch = {};

    if (isExisting) {
      this.snapshot = handler.takeSnapshot(el);
      this.deps.selection.unselect(el.id);
      this.deps.store.hide(el.id);
    } else {
      this.snapshot = null;
    }

    // Ghost-drawer: если handler умеет drawDuringEdit, подписываем worldDrawer
    // который рисует контур фигуры (без текста) на каждом кадре. Live-preview
    // изменений fillColor/strokeColor/shapeKind работает за счёт scheduleRender
    // в recordPatchAndPreview. Регистрируем ДО rerender, чтобы первый кадр
    // уже включал ghost (иначе пользователь видит пустоту до первого pan/zoom).
    if (handler.drawDuringEdit) {
      const drawGhost = handler.drawDuringEdit.bind(handler);
      this.disposeGhostDrawer = this.deps.renderer.addWorldDrawer((ctx) => {
        if (!this.editingEl) return;
        const ghost = {
          ...this.editingEl,
          ...this.pendingPatch,
        } as IElement;
        drawGhost(ctx, ghost, this.deps.store);
      });
    }

    if (isExisting) {
      this.rerender();
    }

    const bounds = handler.getEditingBounds(el, this.deps.store);
    const content = handler.getEditableContent(el);

    const padding = bounds.padding ?? 0;
    const overlayPos = { x: bounds.x + padding, y: bounds.y + padding };

    // bbox-provider читает АКТУАЛЬНЫЙ bbox из store при каждом вызове.
    // Это покрывает кейс, когда элемент изменился во время edit-сессии
    // (например, remote-юзер сделал resize) — overlay autofit пересчитается
    // под новый размер без визуального прыжка на commit.
    // Fallback на исходные bounds если элемент удалён.
    const editingElementId = el.id;
    const getBbox = (): { x: number; y: number; w: number; h: number } => {
      const live = this.deps.store.getById(editingElementId);
      if (live && "width" in live && "height" in live) {
        const sized = live as { x: number; y: number; width: number; height: number };
        return { x: sized.x, y: sized.y, w: sized.width, h: sized.height };
      }
      return {
        x: bounds.x,
        y: bounds.y,
        w: bounds.width ?? 0,
        h: bounds.height ?? 0,
      };
    };

    let shapeMode: IShapeContainerMode | undefined;
    let containerMode: IStickyContainerMode | undefined;

    if (
      bounds.shapeKind !== undefined &&
      bounds.width !== undefined &&
      bounds.height !== undefined
    ) {
      shapeMode = {
        getBbox,
        fillColor: bounds.background ?? "transparent",
        fillPalette: bounds.palette ?? [],
        onFillChange: (color: string) =>
          this.recordPatchAndPreview("fillColor", color),
        strokeColor: bounds.strokeColor ?? DEFAULT_STROKE_COLOR,
        strokePalette: bounds.strokePalette ?? [],
        onStrokeChange: (color: string) =>
          this.recordPatchAndPreview("strokeColor", color),
        shapeKind: bounds.shapeKind,
        shapeKinds: bounds.shapeKinds ?? [],
        onShapeKindChange: (kind: TShapeKind) =>
          this.recordPatchAndPreview("shapeKind", kind),
      };
    } else if (
      bounds.background !== undefined &&
      bounds.width !== undefined &&
      bounds.height !== undefined
    ) {
      containerMode = {
        getBbox,
        color: bounds.background,
        palette: bounds.palette ?? [],
        onColorChange: (color: string) =>
          this.recordPatchAndPreview("color", color),
      };
    }

    this.overlay = new TextEditorOverlay(
      this.deps.container,
      this.deps.containerRect,
      this.deps.camera,
      {
        onFinalize: (text, html, wx, wy, fontSize, textAlign) =>
          this.commit(handler, { text, html, fontSize, textAlign }, wx, wy),
        onCancel: () => this.cancel(),
      },
      overlayPos,
      content.fontSize,
      content.text,
      content.html,
      content.textAlign,
      shapeMode
        ? { shapeMode }
        : containerMode
          ? { containerMode }
          : undefined,
    );
    this.emitEditingIfChanged();
  }

  // Внешняя отмена редактирования по id (например, при удалении элемента
  // снаружи). В отличие от cancel это вход извне, а не из самого overlay.
  cancelExternal(elId: string): void {
    if (this.editingId === elId) this.overlay?.cancel();
  }

  // Уничтожает текущий overlay и сбрасывает ссылку.
  destroy(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.disposeGhostDrawer?.();
    this.disposeGhostDrawer = null;
    this.editingId = null;
    this.emitEditingIfChanged();
  }

  private commit(
    handler: IEditableElementHandler,
    content: IEditableContent,
    wx: number,
    wy: number,
  ): void {
    const id = this.editingId;
    const wasExisting = this.isExisting;
    const oldSnap = this.snapshot;
    const patch = this.pendingPatch;
    const editingEl = this.editingEl;
    this.resetState();
    this.emitEditingIfChanged();

    const isEmpty = !content.text;

    if (wasExisting && id) {
      this.commitExisting(handler, content, id, oldSnap, patch, isEmpty, wx, wy);
      return;
    }

    if (!editingEl) return;

    if (isEmpty) {
      this.deps.renderer.scheduleRender();
      return;
    }

    let created = handler.applyEditedContent(editingEl, content);
    if (Object.keys(patch).length > 0) {
      Object.assign(created, patch);
    }
    if (handler.applyCommitPosition) {
      created = handler.applyCommitPosition(created, wx, wy);
    }
    handler.computeBbox(created, this.deps.store);
    this.deps.commands.createElement(created);
  }

  private commitExisting(
    handler: IEditableElementHandler,
    content: IEditableContent,
    id: string,
    oldSnap: unknown,
    patch: Record<string, unknown>,
    isEmpty: boolean,
    wx: number,
    wy: number,
  ): void {
    if (!this.deps.store.has(id)) {
      this.rerender();
      return;
    }
    const before = this.deps.store.getById(id);
    if (!before) return;

    if (isEmpty && handler.shouldDeleteOnEmpty) {
      // commands.deleteElements заодно делает refreshConnectorBboxes — закрывает
      // latent bug: коннекторы, привязанные к авто-удалённому пустому sticky/text,
      // оставались в RBush со старым bbox.
      this.deps.commands.deleteElements([before]);
      return;
    }

    let updated = handler.applyEditedContent(before, content);
    if (Object.keys(patch).length > 0) {
      Object.assign(updated, patch);
    }
    if (handler.applyCommitPosition) {
      updated = handler.applyCommitPosition(updated, wx, wy);
    }
    handler.computeBbox(updated, this.deps.store);

    this.deps.store.remove(id);
    this.deps.store.add(updated);
    this.deps.store.unhide(id);

    const newSnap = handler.takeSnapshot(updated);
    const shouldRecord = handler.shouldRecordEdit
      ? handler.shouldRecordEdit(oldSnap, newSnap)
      : true;
    if (!shouldRecord) {
      this.rerender();
      return;
    }
    this.deps.pushHistory({
      type: "edit",
      changes: [
        { id, oldData: oldSnap as object, newData: newSnap as object },
      ],
    });
    this.rerender();
  }

  private cancel(): void {
    const id = this.editingId;
    const wasExisting = this.isExisting;
    this.resetState();
    this.emitEditingIfChanged();
    if (wasExisting && id && this.deps.store.has(id)) {
      this.deps.store.unhide(id);
    }
    this.rerender();
  }

  // Записывает отдельное поле в pendingPatch и для нового (не-existing) элемента
  // мутирует in-memory копию, чтобы overlay показывал live preview до commit.
  // Для existing элемента store не трогаем - preview идёт через сам overlay.
  // scheduleRender нужен чтобы ghost-worldDrawer перерисовался с новыми атрибутами.
  private recordPatchAndPreview(key: string, value: unknown): void {
    this.pendingPatch[key] = value;
    if (!this.isExisting && this.editingEl) {
      (this.editingEl as unknown as Record<string, unknown>)[key] = value;
    }
    this.deps.renderer.scheduleRender();
  }

  private resetState(): void {
    this.editingId = null;
    this.isExisting = false;
    this.snapshot = null;
    this.pendingPatch = {};
    this.editingEl = null;
    this.overlay = null;
    this.disposeGhostDrawer?.();
    this.disposeGhostDrawer = null;
  }

  private rerender(): void {
    this.deps.renderer.rebuildBuffer();
    this.deps.renderer.renderFrame();
  }
}
