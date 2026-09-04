// Снимок состояния камеры: смещение и масштаб. Совместим с runtime-классом Camera.
// Поля readonly, чтобы случайно не присвоить через ICamera-ссылку на Camera:
// у Camera только геттеры, такая запись упала бы в runtime.
export interface ICamera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

// Параметры одного уровня фоновой сетки: шаг в мировых единицах и максимальная alpha.
export interface IGridLevel {
  size: number;
  maxAlpha: number;
}
