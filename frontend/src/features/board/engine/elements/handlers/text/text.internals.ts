// Внутренние helpers подмодулей text-handler. НЕ ре-экспортируются через text.handler фасад.

import type { ITextElement } from "@engine/types";
import type { ITextLine } from "@engine/elements/shared/rich-text-layout";
import { htmlToLines } from "@engine/elements/shared/rich-text-layout";

// Кеш парсинга html в ITextLine[]: ключом служит сам элемент (WeakMap),
// сравнение по строке html чтобы не пересобирать когда html не менялся.
interface ITextLinesCacheEntry {
  html: string;
  lines: ITextLine[];
}
const textLinesCache = new WeakMap<ITextElement, ITextLinesCacheEntry>();

// Возвращает спарсенные строки для элемента, использует кеш если html не изменился.
export function getTextLines(element: ITextElement): ITextLine[] {
  const html = element.html ?? "";
  const cached = textLinesCache.get(element);
  if (cached && cached.html === html) return cached.lines;
  const lines = htmlToLines(html);
  textLinesCache.set(element, { html, lines });
  return lines;
}
