import type { IShapeElement, IStrokeBbox } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { rectBbox } from "@engine/utils/bbox";
import { computeAutoFontSize } from "@engine/elements/shared/auto-font-size";
import { computeShapeTextRect } from "./shape.draw";
import {
  SHAPE_DEFAULT_FONT_SIZE,
  SHAPE_MAX_FONT_SIZE,
  SHAPE_MIN_FONT_SIZE,
  TEXT_FONT_FAMILY,
  TEXT_LINE_HEIGHT,
} from "@/features/board/constants/board.constant";

// Подбирает максимальный fontSize по inscribed-rect от computeShapeTextRect,
// чтобы visually-rendered text не вылезал за контур shapeKind (а не за slot).
export function ensureAutoFontSizeShape(el: IShapeElement): void {
  if (!el.autoFontSize) return;
  const inner = computeShapeTextRect(el);
  const innerWidth = Math.max(1, inner.width);
  const innerHeight = Math.max(1, inner.height);
  el.fontSize = computeAutoFontSize(el.html ?? "", innerWidth, innerHeight, {
    fontFamily: TEXT_FONT_FAMILY,
    lineHeight: TEXT_LINE_HEIGHT,
    minFontSize: SHAPE_MIN_FONT_SIZE,
    maxFontSize: SHAPE_MAX_FONT_SIZE,
    defaultFontSize: SHAPE_DEFAULT_FONT_SIZE,
  });
}

// Bbox любой shapeKind равен прямоугольнику слота. Перед расчётом подгоняет
// размер шрифта под inner-rect, чтобы avizually-rendered text не вылезал за padding.
export function computeShapeBbox(
  el: IShapeElement,
  _resolver: IElementResolver,
): IStrokeBbox {
  ensureAutoFontSizeShape(el);
  const bbox = rectBbox(el.x, el.y, el.width, el.height);
  el.bbox = bbox;
  return bbox;
}
