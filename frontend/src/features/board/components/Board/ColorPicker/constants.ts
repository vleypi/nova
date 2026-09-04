import type { CSSProperties } from "react";

// Шахматный паттерн для индикатора прозрачности (стандартное обозначение
// "без заливки" в графических редакторах). Используется и в свотчах пикера,
// и в кнопке-триггере shapeFill в TextFormatToolbar - один источник правды.
export const TRANSPARENT_CHECKER_BG: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 4px 4px",
};

// Размеры canvas-холстов HSV-пикера.
export const PICKER_SV_WIDTH = 196;
export const PICKER_SV_HEIGHT = 140;
export const PICKER_HUE_HEIGHT = 14;
export const PICKER_PANEL_MIN_WIDTH = 216;

// Tailwind-классы позиционирования попапа под триггером.
export const POPOVER_POSITION_CLASSES =
  "absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)]";
