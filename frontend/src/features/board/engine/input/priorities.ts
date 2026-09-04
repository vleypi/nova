// Уровни приоритета для IInputHandler. Чем выше число, тем раньше handler
// получает событие в InputRouter и тем раньше может его консумить.
export const INPUT_PRIORITY = {
  // Активный инструмент (pen, eraser, sticky и т.д.). Должен видеть события первым.
  TOOL: 100,
  // Drag-rect выделение. Срабатывает, если активный select-tool не консумил pointer.
  SELECTION_BOX: 50,
} as const;
