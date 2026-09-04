import type { IElement, TShapeKind } from "@engine/types";
import type {
  IElementHandler,
  IElementResolver,
} from "@engine/elements/interfaces/element-handler";

// Контент редактируемого элемента в плоском виде, в обе стороны:
// извлечь через getEditableContent, применить обратно через applyEditedContent.
export interface IEditableContent {
  text: string;
  html: string;
  fontSize: number;
  textAlign: "left" | "center" | "right";
}

// Где DOM-оверлей редактора живёт в мировых координатах и какая у него подложка.
export interface IEditingBounds {
  x: number;
  y: number;
  // Если не задано, оверлей автосайзится по контенту (text-режим).
  width?: number;
  height?: number;
  // Внутренние отступы оверлея (sticky использует STICKY_PADDING, shape - SHAPE_TEXT_PADDING).
  padding?: number;
  // Цвет фона для container-режима. undefined = прозрачно (text).
  background?: string;
  // Цвет текста в редакторе. Для sticky/shape выводится из background через pickTextColor.
  color?: string;
  // Палитра для color-bar (sticky color, shape fill).
  palette?: readonly string[];
  // Палитра для stroke-color-bar (shape only).
  strokePalette?: readonly string[];
  // Текущий цвет stroke (shape only).
  strokeColor?: string;
  // Текущий shapeKind для kind-switcher (shape only).
  shapeKind?: TShapeKind;
  // Доступные shapeKind для kind-switcher (shape only).
  shapeKinds?: readonly TShapeKind[];
}

// Дефолты для нового editable-элемента, создаваемого через handler.createEmpty.
export interface IEditableDefaults {
  fontSize: number;
  color: string;
  fontFamily: string;
  textAlign: "left" | "center" | "right";
  boardId: string;
  // Опциональный bbox для container-style элементов (sticky).
  initialSize?: { width: number; height: number };
  // Опциональный цвет заливки для container-style.
  fill?: string;
}

// Расширение IElementHandler для типов с inline-редактированием (text, sticky).
// EditingController использует isEditableHandler чтобы сузить тип в runtime.
export interface IEditableElementHandler<T extends IElement = IElement>
  extends IElementHandler<T> {
  // Извлечь редактируемый контент из элемента.
  getEditableContent(el: T): IEditableContent;

  // Применить отредактированный контент к (склонированному) элементу.
  applyEditedContent(el: T, content: IEditableContent): T;

  // Где должен располагаться inline-оверлей в мировых координатах.
  getEditingBounds(el: T, resolver: IElementResolver): IEditingBounds;

  // Создать пустой элемент этого типа в мировой точке (worldX, worldY).
  // Опциональный: ShapeTool создаёт через drag-out, не через click → createEmpty.
  // EditableElementTool требует наличия (text/sticky); если не задан, click-to-create невозможен.
  createEmpty?(worldX: number, worldY: number, defaults: IEditableDefaults): T;

  // Если true, существующий элемент с пустым контентом удаляется при commit
  // (история entry "erase"). Default: false (sticky хранит пустую карточку).
  // Text устанавливает true.
  shouldDeleteOnEmpty?: boolean;

  // Применяет мировую позицию оверлея к committed-элементу. Нужно для autosize-типов,
  // где оверлей дрейфует при росте контента (text). Container-типы (sticky) не используют.
  applyCommitPosition?(el: T, worldX: number, worldY: number): T;

  // Решает, нужно ли производить запись "edit" в историю при commit.
  // Default: true. Sticky использует чтобы пропустить пустой commit (shallow-equal снапшотов).
  shouldRecordEdit?(oldSnapshot: unknown, newSnapshot: unknown): boolean;

  // Опциональный draw для редактирования: handler рисует фигуру/контур БЕЗ текста.
  // EditingController подписывает worldDrawer чтобы за прозрачным editor-div был виден
  // контур (например ellipse/triangle) вместо прямоугольника. Если не задан - ghost
  // не рисуется, editor-div сам отвечает за визуал (как у sticky).
  drawDuringEdit?(
    ctx: CanvasRenderingContext2D,
    el: T,
    resolver: IElementResolver,
  ): void;
}

// Type-guard: handler поддерживает inline-редактирование.
// Проверяет наличие метода getEditableContent (duck-typing по контракту).
export function isEditableHandler<T extends IElement>(
  h: IElementHandler<T>,
): h is IEditableElementHandler<T> {
  return (
    typeof (h as Partial<IEditableElementHandler<T>>).getEditableContent ===
    "function"
  );
}
