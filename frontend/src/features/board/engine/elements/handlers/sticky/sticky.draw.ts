import type { IStickyElement } from "@engine/types";
import { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { drawVisualLines } from "../text.handler";
import {
  htmlToLines,
  layoutRichLines,
} from "@engine/elements/shared/rich-text-layout";
import {
  STICKY_PADDING,
  STICKY_CORNER_RADIUS,
  STICKY_SHADOW_ALPHA,
  STICKY_SHADOW_BLUR,
  STICKY_SHADOW_Y_OFFSET,
  TEXT_FONT_FAMILY,
  TEXT_LINE_HEIGHT,
} from "@/features/board/constants/board.constant";
import { pickTextColor } from "@engine/utils/contrast";

// Строит canvas-path прямоугольника со скруглёнными углами radius r.
// Радиус зажимается до min(r, width/2, height/2) чтобы не вылезть за рамку.
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// Рисует sticky: тень + закруглённый фон + текст с auto-обтеканием.
// Текст рисуется через rich-text layout с маркерами списков и стилями inline-runs.
export function drawSticky(
  ctx: CanvasRenderingContext2D,
  el: IStickyElement,
  _resolver: IElementResolver,
): void {
  // 1. Тень и фон
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${STICKY_SHADOW_ALPHA})`;
  ctx.shadowBlur = STICKY_SHADOW_BLUR;
  ctx.shadowOffsetY = STICKY_SHADOW_Y_OFFSET;
  roundedRectPath(ctx, el.x, el.y, el.width, el.height, STICKY_CORNER_RADIUS);
  ctx.fillStyle = el.color;
  ctx.fill();
  ctx.restore();

  // 2. Текст (с клипом по внутренней области)
  const innerX = el.x + STICKY_PADDING;
  const innerY = el.y + STICKY_PADDING;
  const innerWidth = Math.max(1, el.width - 2 * STICKY_PADDING);
  const innerHeight = Math.max(1, el.height - 2 * STICKY_PADDING);
  const textColor = pickTextColor(el.color);

  ctx.save();
  ctx.beginPath();
  ctx.rect(innerX, innerY, innerWidth, innerHeight);
  ctx.clip();

  const lines = htmlToLines(el.html || el.text || "");
  const { visual } = layoutRichLines(lines, el.fontSize, {
    fontFamily: TEXT_FONT_FAMILY,
    maxWidth: innerWidth,
    lineHeight: TEXT_LINE_HEIGHT,
  });
  // Вертикальное центрирование блока текста внутри inner-rect.
  const blockHeight = visual.length * el.fontSize * TEXT_LINE_HEIGHT;
  const offsetY = Math.max(0, (innerHeight - blockHeight) / 2);
  drawVisualLines(
    ctx,
    visual,
    innerX,
    innerY + offsetY,
    el.fontSize,
    textColor,
    el.textAlign,
    innerWidth,
    { fontFamily: TEXT_FONT_FAMILY, lineHeight: TEXT_LINE_HEIGHT },
  );
  ctx.restore();
}

// Sticky это прямоугольник: попадание в bbox.
export function hitTestSticky(
  el: IStickyElement,
  worldX: number,
  worldY: number,
  _resolver: IElementResolver,
): boolean {
  return (
    worldX >= el.x &&
    worldX <= el.x + el.width &&
    worldY >= el.y &&
    worldY <= el.y + el.height
  );
}

// Пересечение прямоугольников (sticky и query-rect).
export function intersectsRectSticky(
  el: IStickyElement,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  _resolver: IElementResolver,
): boolean {
  return !(
    el.x > maxX ||
    el.x + el.width < minX ||
    el.y > maxY ||
    el.y + el.height < minY
  );
}
