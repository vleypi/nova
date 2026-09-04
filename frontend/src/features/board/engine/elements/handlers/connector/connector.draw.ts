import type { IConnectorElement, IPoint, TArrowEnd } from "@engine/types";
import type { IElementResolver } from "@engine/elements/interfaces/element-handler";
import { cubicTangent } from "@engine/utils/bezier";
import { CONNECTOR_ARROW_HEAD_SIZE } from "@/features/board/constants/board.constant";
import { buildControls, resolveEndpoint } from "./connector.geom";

// Рисует коннектор на canvas: прямую или Безье, с опциональными наконечниками.
// Если endpoint не разрешился (удалённый элемент), просто ничего не рисуем.
export function drawConnector(
  ctx: CanvasRenderingContext2D,
  el: IConnectorElement,
  resolver: IElementResolver,
): void {
  const a = resolveEndpoint(el.start, resolver);
  const b = resolveEndpoint(el.end, resolver);
  if (!a || !b) return;

  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (el.curved) {
    const { c1, c2 } = buildControls(a, b);
    ctx.beginPath();
    ctx.moveTo(a.pos.x, a.pos.y);
    ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.pos.x, b.pos.y);
    ctx.stroke();
    if (el.startArrow !== "none") {
      // Касательная в точке t=0 направлена вдоль кривой; для start-стрелки инвертируем.
      const t = cubicTangent(a.pos, c1, c2, b.pos, 0);
      drawArrowHead(
        ctx,
        a.pos,
        { x: -t.x, y: -t.y },
        el.startArrow,
        el.strokeColor,
      );
    }
    if (el.endArrow !== "none") {
      const t = cubicTangent(a.pos, c1, c2, b.pos, 1);
      drawArrowHead(ctx, b.pos, t, el.endArrow, el.strokeColor);
    }
    return;
  }

  ctx.beginPath();
  ctx.moveTo(a.pos.x, a.pos.y);
  ctx.lineTo(b.pos.x, b.pos.y);
  ctx.stroke();

  const dir = { x: b.pos.x - a.pos.x, y: b.pos.y - a.pos.y };
  if (el.startArrow !== "none") {
    drawArrowHead(
      ctx,
      a.pos,
      { x: -dir.x, y: -dir.y },
      el.startArrow,
      el.strokeColor,
    );
  }
  if (el.endArrow !== "none") {
    drawArrowHead(ctx, b.pos, dir, el.endArrow, el.strokeColor);
  }
}

// Рисует наконечник в точке tip по направлению tangent.
// Для kind="circle" - залитый круг; для "arrow" - треугольник из tip и основания вдоль перпендикуляра.
function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  tip: IPoint,
  tangent: IPoint,
  kind: TArrowEnd,
  color: string,
): void {
  if (kind === "none") return;
  const tLen = Math.hypot(tangent.x, tangent.y);
  if (tLen === 0) return;
  const tx = tangent.x / tLen;
  const ty = tangent.y / tLen;

  if (kind === "circle") {
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, CONNECTOR_ARROW_HEAD_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    return;
  }

  const size = CONNECTOR_ARROW_HEAD_SIZE;
  // Перпендикуляр к tangent.
  const nx = -ty;
  const ny = tx;
  const baseX = tip.x - tx * size;
  const baseY = tip.y - ty * size;
  const halfW = size * 0.5;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(baseX + nx * halfW, baseY + ny * halfW);
  ctx.lineTo(baseX - nx * halfW, baseY - ny * halfW);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
