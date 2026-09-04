import type { IPoint } from "@engine/types";

// Точка на кубической кривой Безье (p0, p1, p2, p3) при параметре t in [0, 1].
export function cubicAt(
  p0: IPoint,
  p1: IPoint,
  p2: IPoint,
  p3: IPoint,
  t: number,
): IPoint {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  const a = uu * u;
  const b = 3 * uu * t;
  const c = 3 * u * tt;
  const d = tt * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

// Касательный вектор кубической Безье в точке t.
export function cubicTangent(
  p0: IPoint,
  p1: IPoint,
  p2: IPoint,
  p3: IPoint,
  t: number,
): IPoint {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return {
    x:
      3 * uu * (p1.x - p0.x) +
      6 * u * t * (p2.x - p1.x) +
      3 * tt * (p3.x - p2.x),
    y:
      3 * uu * (p1.y - p0.y) +
      6 * u * t * (p2.y - p1.y) +
      3 * tt * (p3.y - p2.y),
  };
}

// Равномерная сэмплинг кривой Безье. Возвращает steps+1 точек.
export function sampleCubic(
  p0: IPoint,
  p1: IPoint,
  p2: IPoint,
  p3: IPoint,
  steps: number,
): IPoint[] {
  const samples: IPoint[] = new Array(steps + 1);
  for (let i = 0; i <= steps; i++) samples[i] = cubicAt(p0, p1, p2, p3, i / steps);
  return samples;
}

// Минимальный квадрат расстояния от точки (wx, wy) до полилинии samples.
// Используется для hit-test по кривым (Безье после сэмплирования).
export function minSqDistToSamples(
  samples: IPoint[],
  wx: number,
  wy: number,
): number {
  let best = Infinity;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((wx - a.x) * dx + (wy - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + t * dx - wx;
    const cy = a.y + t * dy - wy;
    const distSq = cx * cx + cy * cy;
    if (distSq < best) best = distSq;
  }
  return best;
}
