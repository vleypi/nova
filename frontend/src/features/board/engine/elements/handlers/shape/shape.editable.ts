import type { IShapeElement } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import type {
  IEditableContent,
  IEditingBounds,
} from "@engine/elements/interfaces/editable-element-handler";
import { makeShouldRecordEdit } from "@engine/elements/shared/should-record-edit";
import { pickTextColor } from "@engine/utils/contrast";
import { drawShape } from "./shape.draw";
import {
  SHAPE_FILL_PALETTE,
  SHAPE_KIND_LIST,
  SHAPE_STROKE_PALETTE,
  SHAPE_TEXT_PADDING,
} from "@/features/board/constants/board.constant";

// Извлекает редактируемый контент shape для inline-оверлея.
export function getEditableContentShape(el: IShapeElement): IEditableContent {
  return {
    text: el.text,
    html: el.html,
    fontSize: el.fontSize,
    textAlign: el.textAlign,
  };
}

// Применяет отредактированный контент к (склонированному) shape.
export function applyEditedContentShape(
  el: IShapeElement,
  content: IEditableContent,
): IShapeElement {
  return {
    ...el,
    text: content.text,
    html: content.html,
    fontSize: content.fontSize,
    textAlign: content.textAlign,
  };
}

// Bounds оверлея для shape. Возвращает shape-специфичные поля (strokeColor, shapeKind, palettes)
// для shapeMode toolbar в EditingController. color/background передаются как есть —
// editor.position.syncContainerFrame сам вызывает pickTextColor(background), который
// обрабатывает "transparent" и совпадает с shape.draw путём.
export function getEditingBoundsShape(
  el: IShapeElement,
  _resolver: IElementResolver,
): IEditingBounds {
  return {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    padding: SHAPE_TEXT_PADDING,
    background: el.fillColor,
    color: pickTextColor(el.fillColor),
    palette: SHAPE_FILL_PALETTE,
    strokePalette: SHAPE_STROKE_PALETTE,
    strokeColor: el.strokeColor,
    shapeKind: el.shapeKind,
    shapeKinds: SHAPE_KIND_LIST,
  };
}

// Поля shape, влияющие на видимое состояние; commit пишет history-entry "edit"
// только если хотя бы одно из них изменилось.
const SHAPE_HISTORY_KEYS: readonly (keyof IShapeElement)[] = [
  "x",
  "y",
  "width",
  "height",
  "shapeKind",
  "strokeColor",
  "strokeWidth",
  "fillColor",
  "text",
  "html",
  "fontSize",
  "autoFontSize",
  "textAlign",
];

// Рисует контур и заливку фигуры без текста. Используется EditingController
// как ghost-worldDrawer, чтобы под прозрачным editor-div была видна реальная форма
// (ellipse/diamond/triangle, не прямоугольник). Текст уже отображается в editor-div.
export function drawDuringEditShape(
  ctx: CanvasRenderingContext2D,
  el: IShapeElement,
  resolver: IElementResolver,
): void {
  drawShape(ctx, { ...el, text: "", html: "" }, resolver);
}

export const shouldRecordEditShape = makeShouldRecordEdit<IShapeElement>(
  SHAPE_HISTORY_KEYS,
);
