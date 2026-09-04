import type { ITextElement, IStrokeBbox } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import {
  TEXT_BBOX_PAD_PX,
  TEXT_LINE_HEIGHT,
} from "@/features/board/constants/board.constant";
import {
  getMetricsCtx,
  getListMarker,
  makeFont,
  LIST_LEVEL_INDENT,
} from "@engine/elements/shared/rich-text-layout";
import { getTextLines } from "./text.internals";

// Считает bbox простого текста (без html, без списков). Каждая \n даёт новую строку,
// ширина определяется по самой длинной через measureText.
export function computePlainTextBbox(
  text: string,
  fontSize: number,
  x: number,
  y: number,
): IStrokeBbox {
  const ctx = getMetricsCtx();
  ctx.font = makeFont(fontSize);
  const lines = text.split("\n");
  let maxWidth = 0;
  for (const line of lines) {
    const width = ctx.measureText(line).width;
    if (width > maxWidth) maxWidth = width;
  }
  const lineHeight = fontSize * TEXT_LINE_HEIGHT;
  return {
    minX: x - TEXT_BBOX_PAD_PX,
    minY: y,
    maxX: x + maxWidth + TEXT_BBOX_PAD_PX,
    maxY: y + lines.length * lineHeight,
  };
}

// Считает bbox rich-текста: учитывает маркеры списков, отступы и стили (bold/italic).
// Counters per list-level отслеживают нумерацию для number-списков.
export function computeRichTextBbox(el: ITextElement): IStrokeBbox {
  const ctx = getMetricsCtx();
  const lines = getTextLines(el);
  const { fontSize, x, y } = el;
  const counters: Record<string, number> = {};
  let maxWidth = 0;
  let prevType: string | undefined;

  for (const line of lines) {
    const listType = line.listType;
    const listLevel = line.listLevel ?? 0;
    const indent = listType ? listLevel * LIST_LEVEL_INDENT : 0;
    if (listType === "number" && prevType !== "number") {
      counters[`number:${listLevel}`] = 0;
    }
    prevType = listType;

    let markerWidth = 0;
    if (listType) {
      const key = `${listType}:${listLevel}`;
      counters[key] = (counters[key] ?? 0) + 1;
      ctx.font = makeFont(fontSize);
      markerWidth = ctx.measureText(
        getListMarker(listType, counters[key] - 1),
      ).width;
    }

    let contentWidth = 0;
    for (const run of line.runs) {
      ctx.font = makeFont(fontSize, run.bold, run.italic);
      contentWidth += ctx.measureText(run.text).width;
    }

    const lineWidth = indent + markerWidth + contentWidth;
    if (lineWidth > maxWidth) maxWidth = lineWidth;
  }

  const lineHeight = fontSize * TEXT_LINE_HEIGHT;
  const lineCount = Math.max(1, lines.length);
  return {
    minX: x - TEXT_BBOX_PAD_PX,
    minY: y,
    maxX: x + maxWidth + TEXT_BBOX_PAD_PX,
    maxY: y + lineCount * lineHeight,
  };
}

// Главный entry-point: выбирает rich или plain bbox в зависимости от наличия html.
export function computeTextBbox(
  el: ITextElement,
  _resolver: IElementResolver,
): IStrokeBbox {
  const bbox = el.html
    ? computeRichTextBbox(el)
    : computePlainTextBbox(el.text, el.fontSize, el.x, el.y);
  el.bbox = bbox;
  return bbox;
}
