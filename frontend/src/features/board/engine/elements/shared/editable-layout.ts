import { TEXT_LINE_HEIGHT } from "@/features/board/constants/board.constant";
import {
  htmlToLines,
  layoutRichLines,
} from "@engine/elements/shared/rich-text-layout";

// Метрики одной визуальной строки лейаута.
export interface IMeasuredLine {
  // Y-координата верха строки от начала лейаута, в CSS-пикселях.
  y: number;
  // Высота строки в CSS-пикселях (fontSize * TEXT_LINE_HEIGHT).
  height: number;
}

// Результат измерения лейаута редактируемого контента.
export interface IMeasuredLayout {
  // Ширина самой длинной визуальной строки в CSS-пикселях.
  width: number;
  // Полная высота: количество строк * lineHeight.
  height: number;
  // Метрики каждой строки для UI-наложений (позиционирование курсора и т.п.).
  lines: IMeasuredLine[];
}

// Считает лейаут редактируемого HTML той же математикой что и canvas-рендер.
// Ключевая идея: DOM-оверлей и canvas-рендерер вызывают одну функцию, чтобы
// при commit не было визуального "прыжка" из-за расхождения метрик.
export function measureEditableLayout(
  html: string,
  fontSize: number,
  fontFamily: string,
  maxWidth?: number,
): IMeasuredLayout {
  const logical = htmlToLines(html);
  const {
    visual,
    totalHeight,
    maxWidth: width,
  } = layoutRichLines(logical, fontSize, {
    fontFamily,
    lineHeight: TEXT_LINE_HEIGHT,
    maxWidth,
  });
  const lineHeight = fontSize * TEXT_LINE_HEIGHT;
  return {
    width,
    height: totalHeight,
    lines: visual.map((_, i) => ({ y: i * lineHeight, height: lineHeight })),
  };
}
