import {
  htmlToLines,
  layoutRichLines,
} from "@engine/elements/shared/rich-text-layout";

// Параметры подбора авто-размера шрифта.
export interface IAutoFontSizeOpts {
  fontFamily: string;
  lineHeight: number;
  minFontSize: number;
  maxFontSize: number;
  defaultFontSize: number;
}

// Бинарным поиском находит максимальный font-size, при котором результат лейаута
// помещается в (innerWidth x innerHeight). Пустой контент возвращает default.
// Используется для container-mode элементов (sticky и будущие подобные).
export function computeAutoFontSize(
  html: string,
  innerWidth: number,
  innerHeight: number,
  options: IAutoFontSizeOpts,
): number {
  const lines = htmlToLines(html);
  if (isLayoutEmpty(lines)) return options.defaultFontSize;

  let lo = options.minFontSize;
  let hi = options.maxFontSize;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const { totalHeight } = layoutRichLines(lines, mid, {
      fontFamily: options.fontFamily,
      maxWidth: innerWidth,
      lineHeight: options.lineHeight,
    });
    if (totalHeight <= innerHeight) lo = mid;
    else hi = mid;
  }
  return lo;
}

// True если лейаут пустой: ни одной строки или единственная строка без текста.
function isLayoutEmpty(lines: ReturnType<typeof htmlToLines>): boolean {
  if (lines.length === 0) return true;
  if (lines.length === 1 && lines[0].runs.every((run) => !run.text)) return true;
  return false;
}
