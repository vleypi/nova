import type { IShapeElement, TShapeKind } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import {
  SHAPE_TEXT_PADDING,
  TEXT_FONT_FAMILY,
  TEXT_LINE_HEIGHT,
} from "@/features/board/constants/board.constant";
import {
  htmlToLines,
  layoutRichLines,
} from "@engine/elements/shared/rich-text-layout";
import { drawVisualLines } from "@engine/elements/handlers/text.handler";
import { pickTextColor } from "@engine/utils/contrast";

// Рисует фигуру: путь по shapeKind, затем опциональный fill и stroke.
// Все 4 подтипа вписаны в bbox-прямоугольник (x, y, width, height).
export function drawShape(
  ctx: CanvasRenderingContext2D,
  el: IShapeElement,
  _resolver: IElementResolver,
): void {
  ctx.save();
  ctx.beginPath();
  buildShapePath(ctx, el);

  if (el.fillColor !== "transparent") {
    ctx.fillStyle = el.fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.stroke();
  ctx.restore();

  if (el.html || el.text) {
    drawShapeText(ctx, el);
  }
}

// Строит canvas-path для текущего shapeKind. ctx уже в beginPath.
function buildShapePath(
  ctx: CanvasRenderingContext2D,
  el: IShapeElement,
): void {
  const { x, y, width, height, shapeKind } = el;
  switch (shapeKind) {
    case "rect": {
      ctx.rect(x, y, width, height);
      return;
    }
    case "ellipse": {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = width / 2;
      const ry = height / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      return;
    }
    case "diamond": {
      const cx = x + width / 2;
      const cy = y + height / 2;
      ctx.moveTo(cx, y);
      ctx.lineTo(x + width, cy);
      ctx.lineTo(cx, y + height);
      ctx.lineTo(x, cy);
      ctx.closePath();
      return;
    }
    case "triangle": {
      const apex = x + width / 2;
      ctx.moveTo(apex, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      return;
    }
  }
}

// Прямоугольник для размещения текста внутри фигуры. Учитывает геометрию shapeKind:
// rect - slot минус padding; ellipse - inscribed rect (w/sqrt2 x h/sqrt2);
// diamond - inscribed rect (w/2 x h/2); triangle (apex top) - bottom-anchored
// rect шириной w/2 у основания, где треугольник наиболее широк.
export function computeShapeTextRect(box: {
  x: number;
  y: number;
  width: number;
  height: number;
  shapeKind: TShapeKind;
}): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const pad = SHAPE_TEXT_PADDING;
  const slotX = box.x + pad;
  const slotY = box.y + pad;
  const slotW = Math.max(1, box.width - 2 * pad);
  const slotH = Math.max(1, box.height - 2 * pad);
  switch (box.shapeKind) {
    case "rect":
      return { x: slotX, y: slotY, width: slotW, height: slotH };
    case "ellipse": {
      const w = slotW / Math.SQRT2;
      const h = slotH / Math.SQRT2;
      return {
        x: slotX + (slotW - w) / 2,
        y: slotY + (slotH - h) / 2,
        width: w,
        height: h,
      };
    }
    case "diamond": {
      const w = slotW / 2;
      const h = slotH / 2;
      return {
        x: slotX + (slotW - w) / 2,
        y: slotY + (slotH - h) / 2,
        width: w,
        height: h,
      };
    }
    case "triangle": {
      const w = slotW / 2;
      const h = slotH / 2;
      return {
        x: slotX + (slotW - w) / 2,
        y: slotY + slotH - h,
        width: w,
        height: h,
      };
    }
  }
}

// Рисует rich-text внутри фигуры с auto-обтеканием по inscribed-rect от computeShapeTextRect.
// Цвет текста: pickTextColor(fillColor) — внутри pickTextColor "transparent" сводится к DARK_TEXT.
// Per-run цвета (через `<font color>` в html) перекрывают.
function drawShapeText(
  ctx: CanvasRenderingContext2D,
  el: IShapeElement,
): void {
  const inner = computeShapeTextRect(el);
  // pickTextColor сам обрабатывает "transparent" → DARK_TEXT. Тот же путь
  // используется в editor.position.syncContainerFrame для shape-mode, чтобы
  // не было сдвига цвета на commit.
  const textColor = pickTextColor(el.fillColor);

  const lines = htmlToLines(el.html || el.text || "");
  const { visual } = layoutRichLines(lines, el.fontSize, {
    fontFamily: TEXT_FONT_FAMILY,
    maxWidth: inner.width,
    lineHeight: TEXT_LINE_HEIGHT,
  });
  // Вертикальное центрирование блока текста внутри inscribed-rect.
  const blockHeight = visual.length * el.fontSize * TEXT_LINE_HEIGHT;
  const offsetY = Math.max(0, (inner.height - blockHeight) / 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(inner.x, inner.y, inner.width, inner.height);
  ctx.clip();
  drawVisualLines(
    ctx,
    visual,
    inner.x,
    inner.y + offsetY,
    el.fontSize,
    textColor,
    el.textAlign,
    inner.width,
    { fontFamily: TEXT_FONT_FAMILY, lineHeight: TEXT_LINE_HEIGHT },
  );
  ctx.restore();
}
