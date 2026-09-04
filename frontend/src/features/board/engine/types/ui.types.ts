// Активный инструмент верхнего уровня. "pen" - группа, конкретный pen-tool в TPenTool.
export type TTool = "select" | "pen" | "text" | "sticky" | "shape";

// Подгруппа pen: что именно делает тул "pen".
export type TPenTool = "pencil" | "eraser";

// Статус соединения с сервером для индикации в UI.
export type TConnectionStatus = "connected" | "reconnecting" | "failed";

// Прямоугольник рамки выделения в screen-координатах. Эмитится для UI-оверлея.
export interface ISelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
