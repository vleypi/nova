import type { IStroke } from "@engine/types";

// Рисует штрих карандаша на canvas. Сглаживает линию через quadratic curves
// между серединами соседних точек. Одиночная точка рисуется как круг.
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: IStroke,
): void {
  const { points, color, width } = stroke;
  if (points.length === 0) return;

  if (points.length === 1) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    // Первая точка ведёт к середине между p0 и p1, дальше серии quadratic
    // через точки-control с концами в midpoint'ах. Хвост дотягивается до последней точки.
    ctx.lineTo(
      (points[0].x + points[1].x) / 2,
      (points[0].y + points[1].y) / 2,
    );
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i].x + points[i + 1].x) / 2;
      const my = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  }
  ctx.stroke();
}
