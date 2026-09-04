import { ITextElement } from "@engine/types";
import { IElementResolver } from "@engine/elements/interfaces/element-handler";
import {
  IEditableContent,
  IEditingBounds,
  IEditableDefaults,
} from "@engine/elements/interfaces/editable-element-handler";

// Извлекает редактируемый контент текста для inline-оверлея.
export function getEditableContentText(el: ITextElement): IEditableContent {
  return {
    text: el.text,
    html: el.html ?? "",
    fontSize: el.fontSize,
    textAlign: el.textAlign ?? "left",
  };
}

// Применяет отредактированный контент к (склонированному) элементу.
export function applyEditedContentText(
  el: ITextElement,
  content: IEditableContent,
): ITextElement {
  return {
    ...el,
    text: content.text,
    html: content.html,
    fontSize: content.fontSize,
    textAlign: content.textAlign,
  };
}

// Bounds оверлея: только позиция и цвет, без width/height.
// Текст автосайзится по контенту, размеры не задаются.
export function getEditingBoundsText(
  el: ITextElement,
  _resolver: IElementResolver,
): IEditingBounds {
  return { x: el.x, y: el.y, color: el.color };
}

// Создаёт пустой текстовый элемент в мировой точке (worldX, worldY).
export function createEmptyText(
  worldX: number,
  worldY: number,
  defaults: IEditableDefaults,
): ITextElement {
  return {
    id: crypto.randomUUID(),
    type: "text",
    text: "",
    html: "",
    x: worldX,
    y: worldY,
    fontSize: defaults.fontSize,
    color: defaults.color,
    textAlign: defaults.textAlign,
    userId: "",
    boardId: defaults.boardId,
    createdAt: Date.now(),
  };
}

// Текст автосайзится: позиция оверлея становится позицией коммитнутого элемента.
// Используется EditingController когда оверлей дрейфовал при росте контента.
export function applyCommitPositionText(
  el: ITextElement,
  worldX: number,
  worldY: number,
): ITextElement {
  return { ...el, x: worldX, y: worldY };
}

// Текст удаляет себя при commit с пустым контентом (зеркалит pre-refactor TextTool).
// Sticky это поведение не использует и хранит пустую карточку.
export const TEXT_DELETE_ON_EMPTY = true;
