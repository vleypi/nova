// Поля прямоугольника, которые масштабирует applyRectResize.
export interface IRectFields {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Опции масштабирования.
export interface IRectResizeOpts {
  // Нижняя граница ширины и высоты после масштаба.
  minWidth?: number;
  minHeight?: number;
  // Если true, scale-факторы зажимаются снизу единицей (растёт, но не уменьшается).
  // Используется в sticky для grow-only ресайза.
  growOnly?: boolean;
}

// Масштабирует прямоугольник от якорной точки (anchorX, anchorY) с factor по осям.
// Используется в snapshot-логике sticky/shape/image при drag-resize.
//
// При clamp ширины/высоты до min (включая случай отрицательного scale — когда юзер
// перетащил курсор через якорь) позиция корректируется так, чтобы сторона,
// прилегающая к якорю, осталась на якоре. Без этого элемент уплывал бы со своей
// «опоры», а в случае отрицательного scale флипался на противоположную сторону.
export function applyRectResize(
  snapshot: IRectFields,
  anchorX: number,
  anchorY: number,
  scaleX: number,
  scaleY: number,
  opts: IRectResizeOpts = {},
): IRectFields {
  const sx = opts.growOnly ? Math.max(1, scaleX) : scaleX;
  const sy = opts.growOnly ? Math.max(1, scaleY) : scaleY;

  // Какая сторона snapshot ближе к якорю — та «приклеена» и должна остаться на anchor.
  const isLeftAnchored =
    Math.abs(snapshot.x - anchorX) <
    Math.abs(snapshot.x + snapshot.width - anchorX);
  const isTopAnchored =
    Math.abs(snapshot.y - anchorY) <
    Math.abs(snapshot.y + snapshot.height - anchorY);

  const minWidth = opts.minWidth ?? 0;
  const minHeight = opts.minHeight ?? 0;

  let width = snapshot.width * sx;
  let height = snapshot.height * sy;
  let x: number;
  let y: number;

  if (width >= minWidth) {
    x = anchorX + (snapshot.x - anchorX) * sx;
  } else {
    width = minWidth;
    x = isLeftAnchored ? anchorX : anchorX - width;
  }
  if (height >= minHeight) {
    y = anchorY + (snapshot.y - anchorY) * sy;
  } else {
    height = minHeight;
    y = isTopAnchored ? anchorY : anchorY - height;
  }

  return { x, y, width, height };
}
