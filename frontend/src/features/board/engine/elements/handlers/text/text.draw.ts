import type { ITextElement } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import {
  TEXT_LINE_HEIGHT,
  TEXT_LINK_COLOR,
} from "@/features/board/constants/board.constant";
import type { IVisualLine } from "@engine/elements/shared/rich-text-layout";
import {
  getMetricsCtx,
  getListMarker,
  makeFont,
  LIST_LEVEL_INDENT,
} from "@engine/elements/shared/rich-text-layout";
import { getTextLines } from "./text.internals";

// Параметры отрисовки rich-text лейаута на canvas.
export interface IDrawOpts {
  fontFamily: string;
  lineHeight: number;
  linkColor?: string;
  onLinkArea?: (area: ILinkArea) => void;
  clipBbox?: { x: number; y: number; w: number; h: number };
}

// Прямоугольник кликабельной зоны ссылки в мировых координатах.
export interface ILinkArea {
  url: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Кеш link-зон для hit-test ссылок (Ctrl+click). Заполняется в drawRichText.
// Кеш модульный, поэтому шарится между всеми инстансами движка на странице
// (id элемента уникален, коллизий нет). Очистка по removal подписывается в text.handler.ts
// через registerStoreInitHook, чтобы BoardEngine не знал о деталях text-handler-а.
export const linkAreaCache = new Map<string, ILinkArea[]>();

// Возвращает url ссылки под мировой точкой или null.
export function getLinkAtWorldPoint(
  el: ITextElement,
  wx: number,
  wy: number,
): string | null {
  const areas = linkAreaCache.get(el.id);
  if (!areas) return null;
  for (const area of areas) {
    if (wx >= area.minX && wx <= area.maxX && wy >= area.minY && wy <= area.maxY) {
      return area.url;
    }
  }
  return null;
}

// LRU-cap для кеша baseline-смещений по fontSize.
const BASELINE_CACHE_CAP = 32;
const baselineCache = new Map<number, number>();

// Возвращает baseline-смещение текста: расстояние от top line-box (= el.y)
// до alphabetic baseline (= y-параметр ctx.fillText). Состоит из:
//   halfLeading = (lineHeight - fontSize) / 2 — CSS-style верхний leading
//   fontAscent  = fontBoundingBoxAscent — typographic ascent шрифта (sTypoAscender),
//                 то же значение что CSS использует для позиционирования baseline
//                 внутри line-box. Это ключ к parity между canvas и DOM editor.
// fontBoundingBoxAscent — про шрифт целиком (em-box), не про конкретный глиф —
// поэтому масштабируется линейно и предсказуемо. actualBoundingBoxAscent (которое
// было раньше) — про bounding box глифа "M" — даёт неправильную позицию baseline
// в line-box и видимо дёргает текст на non-integer zoom.
function getBaselineOffset(fontSize: number): number {
  const cached = baselineCache.get(fontSize);
  if (cached !== undefined) {
    // Touch для LRU-порядка.
    baselineCache.delete(fontSize);
    baselineCache.set(fontSize, cached);
    return cached;
  }
  const halfLeading = (fontSize * TEXT_LINE_HEIGHT - fontSize) / 2;
  const ctx = getMetricsCtx();
  ctx.font = makeFont(fontSize);
  const metrics = ctx.measureText("M");
  // fontBoundingBoxAscent — стандарт с 2017+, fallback на actualBoundingBoxAscent
  // для очень старых браузеров, и константа 0.95 как последняя инстанция.
  const fontAscent =
    metrics.fontBoundingBoxAscent ??
    metrics.actualBoundingBoxAscent ??
    fontSize * 0.95;
  const offset = halfLeading + fontAscent;
  baselineCache.set(fontSize, offset);
  if (baselineCache.size > BASELINE_CACHE_CAP) {
    const oldest = baselineCache.keys().next().value;
    if (oldest !== undefined) baselineCache.delete(oldest);
  }
  return offset;
}

// Typography-коэффициенты для drawRichText (alphabetic baseline).
// Считаются от baseline вверх/вниз пропорционально fontSize.
const RICH_HIGHLIGHT_TOP_FACTOR = 0.85;
const RICH_UNDERLINE_OFFSET_FACTOR = 0.12;
const RICH_STRIKETHROUGH_OFFSET_FACTOR = 0.35;
const RICH_LINK_AREA_BOTTOM_FACTOR = 0.2;
const TEXT_LINE_THICKNESS_FACTOR = 0.08;

// Рисует rich-text элемент: lists, маркеры, runs со стилями (bold/italic/underline
// /strike/highlight/link/color). Использует alphabetic baseline.
// Также наполняет linkAreaCache для последующего hit-test ссылок.
function drawRichText(ctx: CanvasRenderingContext2D, el: ITextElement): void {
  if (!el.html) return;
  const { x, y, fontSize, color } = el;
  const align = el.textAlign ?? "left";
  const lineHeight = fontSize * TEXT_LINE_HEIGHT;
  const baseline = getBaselineOffset(fontSize);
  const lines = getTextLines(el);
  const metricsCtx = getMetricsCtx();
  const linkAreas: ILinkArea[] = [];

  interface ILineMeasure {
    totalWidth: number;
    indent: number;
    markerWidth: number;
    marker: string;
  }
  const counters: Record<string, number> = {};
  let prevType: string | undefined;

  // Pre-measure всех строк: indent + markerWidth + сумма ширин runs.
  const measures: ILineMeasure[] = lines.map((line) => {
    const listType = line.listType;
    const listLevel = line.listLevel ?? 0;
    const indent = listType ? listLevel * LIST_LEVEL_INDENT : 0;
    if (listType === "number" && prevType !== "number") {
      counters[`number:${listLevel}`] = 0;
    }
    prevType = listType;
    let markerWidth = 0;
    let marker = "";
    if (listType) {
      const key = `${listType}:${listLevel}`;
      counters[key] = (counters[key] ?? 0) + 1;
      marker = getListMarker(listType, counters[key] - 1);
      metricsCtx.font = makeFont(fontSize);
      markerWidth = metricsCtx.measureText(marker).width;
    }
    let contentWidth = 0;
    for (const run of line.runs) {
      metricsCtx.font = makeFont(fontSize, run.bold, run.italic);
      contentWidth += metricsCtx.measureText(run.text).width;
    }
    return {
      totalWidth: indent + markerWidth + contentWidth,
      indent,
      markerWidth,
      marker,
    };
  });

  const maxWidth = Math.max(0, ...measures.map((m) => m.totalWidth));
  ctx.textBaseline = "alphabetic";

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const measure = measures[li];
    const lineY = y + baseline + li * lineHeight;
    let lineStartX = x;
    if (align === "center") {
      lineStartX = x + (maxWidth - measure.totalWidth) / 2;
    } else if (align === "right") {
      lineStartX = x + maxWidth - measure.totalWidth;
    }
    let cursorX = lineStartX + measure.indent;

    if (measure.marker) {
      ctx.font = makeFont(fontSize);
      ctx.fillStyle = color;
      ctx.fillText(measure.marker, cursorX, lineY);
      cursorX += measure.markerWidth;
    }

    for (const run of line.runs) {
      if (!run.text) continue;
      ctx.font = makeFont(fontSize, run.bold, run.italic);
      const runWidth = ctx.measureText(run.text).width;

      if (
        run.highlight &&
        run.highlight !== "transparent" &&
        run.highlight !== "rgba(0, 0, 0, 0)"
      ) {
        ctx.fillStyle = run.highlight;
        ctx.fillRect(
          cursorX,
          lineY - fontSize * RICH_HIGHLIGHT_TOP_FACTOR,
          runWidth,
          lineHeight,
        );
      }

      const runColor = run.link ? TEXT_LINK_COLOR : (run.color ?? color);
      ctx.fillStyle = runColor;
      ctx.fillText(run.text, cursorX, lineY);

      if (run.underline || run.link) {
        const uY = lineY + fontSize * RICH_UNDERLINE_OFFSET_FACTOR;
        ctx.beginPath();
        ctx.moveTo(cursorX, uY);
        ctx.lineTo(cursorX + runWidth, uY);
        ctx.strokeStyle = runColor;
        ctx.lineWidth = Math.max(1, fontSize * TEXT_LINE_THICKNESS_FACTOR);
        ctx.stroke();
      }
      if (run.strikeThrough) {
        const sY = lineY - fontSize * RICH_STRIKETHROUGH_OFFSET_FACTOR;
        ctx.beginPath();
        ctx.moveTo(cursorX, sY);
        ctx.lineTo(cursorX + runWidth, sY);
        ctx.strokeStyle = runColor;
        ctx.lineWidth = Math.max(1, fontSize * TEXT_LINE_THICKNESS_FACTOR);
        ctx.stroke();
      }

      if (run.link) {
        linkAreas.push({
          url: run.link,
          minX: cursorX,
          minY: lineY - fontSize,
          maxX: cursorX + runWidth,
          maxY: lineY + fontSize * RICH_LINK_AREA_BOTTOM_FACTOR,
        });
      }
      cursorX += runWidth;
    }
  }
  linkAreaCache.set(el.id, linkAreas);
}

// Главный entry-point: rich или plain text в зависимости от наличия html.
export function drawText(
  ctx: CanvasRenderingContext2D,
  el: ITextElement,
  _resolver: IElementResolver,
): void {
  if (el.html) {
    drawRichText(ctx, el);
    return;
  }
  const { text, x, y, fontSize, color } = el;
  if (!text) return;
  ctx.font = makeFont(fontSize);
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  const align = el.textAlign ?? "left";
  const lineHeight = fontSize * TEXT_LINE_HEIGHT;
  const baseline = getBaselineOffset(fontSize);
  const lines = text.split("\n");
  const lineWidths = lines.map((line) => ctx.measureText(line).width);
  const maxWidth = Math.max(0, ...lineWidths);
  for (let i = 0; i < lines.length; i++) {
    let lineX = x;
    if (align === "center") {
      lineX = x + (maxWidth - lineWidths[i]) / 2;
    } else if (align === "right") {
      lineX = x + maxWidth - lineWidths[i];
    }
    ctx.fillText(lines[i], lineX, y + baseline + i * lineHeight);
  }
}

// Typography-коэффициенты для drawVisualLines (top baseline).
// Считаются от textTop вниз пропорционально fontSize.
const VISUAL_UNDERLINE_OFFSET_FACTOR = 0.95;
const VISUAL_STRIKETHROUGH_OFFSET_FACTOR = 0.5;

// Рисует pre-laid-out IVisualLine[] с textBaseline = "top".
// Используется для container-mode (sticky), где layout уже посчитан через layoutRichLines.
// Высота строки точно lineHeight, что гарантирует совпадение с totalHeight из layoutRichLines.
export function drawVisualLines(
  ctx: CanvasRenderingContext2D,
  visual: IVisualLine[],
  x: number,
  y: number,
  fontSize: number,
  color: string,
  align: "left" | "center" | "right",
  boxWidth: number,
  opts: IDrawOpts,
): void {
  const lineHeight = fontSize * opts.lineHeight;
  // Верхний leading: половина пустого пространства между fontSize и lineHeight,
  // как делает CSS по умолчанию.
  const halfLeading = (lineHeight - fontSize) / 2;
  const metricsCtx = getMetricsCtx();

  type ILineMeasure = { indent: number; markerWidth: number; runWidth: number };
  const measures: ILineMeasure[] = visual.map((vl) => {
    const indent = (vl.listLevel ?? 0) * LIST_LEVEL_INDENT;
    let markerWidth = 0;
    if (vl.markerText) {
      metricsCtx.font = makeFont(fontSize);
      markerWidth = metricsCtx.measureText(vl.markerText).width;
    }
    let runWidth = 0;
    for (const run of vl.runs) {
      metricsCtx.font = makeFont(fontSize, run.bold, run.italic);
      runWidth += metricsCtx.measureText(run.text).width;
    }
    return { indent, markerWidth, runWidth };
  });

  ctx.textBaseline = "top";
  for (let i = 0; i < visual.length; i++) {
    const visualLine = visual[i];
    const measure = measures[i];
    const lineTop = y + i * lineHeight;
    const textTop = lineTop + halfLeading;

    // Indent списка резервирует левое место; alignment применяется к остатку.
    const innerX = x + measure.indent + measure.markerWidth;
    const innerWidth = Math.max(
      0,
      boxWidth - measure.indent - measure.markerWidth,
    );
    let cursorX = innerX;
    if (align === "center") {
      cursorX = innerX + (innerWidth - measure.runWidth) / 2;
    } else if (align === "right") {
      cursorX = innerX + innerWidth - measure.runWidth;
    }

    // Маркер списка только на первой wrap-строке логической.
    if (visualLine.markerText) {
      ctx.font = makeFont(fontSize);
      ctx.fillStyle = color;
      ctx.fillText(visualLine.markerText, x + measure.indent, textTop);
    }

    for (const run of visualLine.runs) {
      if (!run.text) continue;
      ctx.font = makeFont(fontSize, run.bold, run.italic);
      const runWidth = ctx.measureText(run.text).width;

      if (
        run.highlight &&
        run.highlight !== "transparent" &&
        run.highlight !== "rgba(0, 0, 0, 0)"
      ) {
        ctx.fillStyle = run.highlight;
        ctx.fillRect(cursorX, lineTop, runWidth, lineHeight);
      }

      const runColor = run.link
        ? (opts.linkColor ?? TEXT_LINK_COLOR)
        : (run.color ?? color);
      ctx.fillStyle = runColor;
      ctx.fillText(run.text, cursorX, textTop);

      if (run.underline || run.link) {
        const uY = textTop + fontSize * VISUAL_UNDERLINE_OFFSET_FACTOR;
        ctx.beginPath();
        ctx.moveTo(cursorX, uY);
        ctx.lineTo(cursorX + runWidth, uY);
        ctx.strokeStyle = runColor;
        ctx.lineWidth = Math.max(1, fontSize * TEXT_LINE_THICKNESS_FACTOR);
        ctx.stroke();
      }
      if (run.strikeThrough) {
        const sY = textTop + fontSize * VISUAL_STRIKETHROUGH_OFFSET_FACTOR;
        ctx.beginPath();
        ctx.moveTo(cursorX, sY);
        ctx.lineTo(cursorX + runWidth, sY);
        ctx.strokeStyle = runColor;
        ctx.lineWidth = Math.max(1, fontSize * TEXT_LINE_THICKNESS_FACTOR);
        ctx.stroke();
      }
      if (run.link && opts.onLinkArea) {
        opts.onLinkArea({
          url: run.link,
          minX: cursorX,
          minY: lineTop,
          maxX: cursorX + runWidth,
          maxY: lineTop + lineHeight,
        });
      }
      cursorX += runWidth;
    }
  }
}
