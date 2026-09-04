import type { IStickyElement, IStrokeBbox } from "@engine/types";
import {
  STICKY_PADDING,
  STICKY_MIN_FONT_SIZE,
  STICKY_MAX_FONT_SIZE,
  STICKY_DEFAULT_FONT_SIZE,
  TEXT_FONT_FAMILY,
  TEXT_LINE_HEIGHT,
} from "@/features/board/constants/board.constant";
import { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { computeAutoFontSize } from "@engine/elements/shared/auto-font-size";
import { rectBbox } from "@engine/utils/bbox";

// Если у sticky autoFontSize=true, подбирает максимальный fontSize, при котором
// текст помещается во внутреннюю область (с учётом STICKY_PADDING с каждой стороны).
export function ensureAutoFontSize(el: IStickyElement): void {
  if (!el.autoFontSize) return;
  const innerWidth = Math.max(1, el.width - 2 * STICKY_PADDING);
  const innerHeight = Math.max(1, el.height - 2 * STICKY_PADDING);
  const computedFontSize = computeAutoFontSize(
    el.html ?? "",
    innerWidth,
    innerHeight,
    {
      fontFamily: TEXT_FONT_FAMILY,
      lineHeight: TEXT_LINE_HEIGHT,
      minFontSize: STICKY_MIN_FONT_SIZE,
      maxFontSize: STICKY_MAX_FONT_SIZE,
      defaultFontSize: STICKY_DEFAULT_FONT_SIZE,
    },
  );
  el.fontSize = computedFontSize;
}

// Bbox sticky это просто прямоугольник элемента; авто-размер шрифта пересчитывается заодно.
export function computeStickyBbox(
  el: IStickyElement,
  _resolver: IElementResolver,
): IStrokeBbox {
  ensureAutoFontSize(el);
  const bbox = rectBbox(el.x, el.y, el.width, el.height);
  el.bbox = bbox;
  return bbox;
}
