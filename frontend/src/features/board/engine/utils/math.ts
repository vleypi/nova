// Зажимает value в диапазон [min, max].
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Квадрат расстояния от точки (px, py) до отрезка (a, b).
// Используется для hit-test штрихов и коннекторов: для "попадания" сравниваем
// квадрат с (width/2 + tolerance)^2, чтобы не звать sqrt в горячем цикле.
export function pointToSegmentDistSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - ax) ** 2 + (py - ay) ** 2;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
}
