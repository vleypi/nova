import { IStickyElement } from "@engine/types";
import { IElementResolver } from "@engine/elements/interfaces/element-handler";
import {
  IEditableContent,
  IEditingBounds,
  IEditableDefaults,
} from "@engine/elements/interfaces/editable-element-handler";
import { makeShouldRecordEdit } from "@engine/elements/shared/should-record-edit";
import { pickTextColor } from "@engine/utils/contrast";
import {
  DEFAULT_STICKY_SIZE,
  STICKY_DEFAULT_COLOR,
  STICKY_DEFAULT_FONT_SIZE,
  STICKY_PADDING,
  STICKY_PALETTE,
} from "@/features/board/constants/board.constant";

// Извлекает редактируемый контент sticky для inline-оверлея.
export function getEditableContentSticky(
  el: IStickyElement,
): IEditableContent {
  return {
    text: el.text,
    html: el.html,
    fontSize: el.fontSize,
    textAlign: el.textAlign,
  };
}

// Применяет отредактированный контент к (склонированному) sticky.
export function applyEditedContentSticky(
  el: IStickyElement,
  content: IEditableContent,
): IStickyElement {
  return {
    ...el,
    text: content.text,
    html: content.html,
    fontSize: content.fontSize,
    textAlign: content.textAlign,
  };
}

// Bounds оверлея для sticky: фиксированный прямоугольник, цвет фона из элемента,
// цвет текста подбирается по контрасту, палитра из STICKY_PALETTE для color-bar.
export function getEditingBoundsSticky(
  el: IStickyElement,
  _resolver: IElementResolver,
): IEditingBounds {
  return {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    padding: STICKY_PADDING,
    background: el.color,
    color: pickTextColor(el.color),
    palette: STICKY_PALETTE,
  };
}

// Создаёт пустой sticky в мировой точке (worldX, worldY). Размер из defaults
// либо DEFAULT_STICKY_SIZE; новый sticky центрируется на (worldX, worldY).
export function createEmptySticky(
  worldX: number,
  worldY: number,
  defaults: IEditableDefaults,
): IStickyElement {
  const width = defaults.initialSize?.width ?? DEFAULT_STICKY_SIZE;
  const height = defaults.initialSize?.height ?? DEFAULT_STICKY_SIZE;
  return {
    id: crypto.randomUUID(),
    type: "sticky",
    userId: "",
    boardId: defaults.boardId,
    createdAt: Date.now(),
    x: worldX - width / 2,
    y: worldY - height / 2,
    width,
    height,
    color: defaults.fill ?? STICKY_DEFAULT_COLOR,
    html: "",
    text: "",
    fontSize: defaults.fontSize ?? STICKY_DEFAULT_FONT_SIZE,
    autoFontSize: true,
    textAlign: "center",
  };
}

// Поля sticky, влияющие на видимое состояние; commit пишет history-entry "edit"
// только если хотя бы одно из них изменилось (shallow-compare).
const STICKY_HISTORY_KEYS: readonly (keyof IStickyElement)[] = [
  "x",
  "y",
  "width",
  "height",
  "color",
  "html",
  "text",
  "fontSize",
  "autoFontSize",
  "textAlign",
];

export const shouldRecordEditSticky = makeShouldRecordEdit<IStickyElement>(
  STICKY_HISTORY_KEYS,
);
