// Generic rich-text утилиты: парсинг HTML в логические строки, wrap-лейаут
// с маркерами списков и форматами, плюс canvas-helpers для замера ширины.
// Используется и text-handler-ом, и sticky-handler-ом, поэтому живёт в shared.

import {
  TEXT_FONT_FAMILY,
  TEXT_BBOX_PAD_PX,
} from "@/features/board/constants/board.constant";

// Один inline-фрагмент со стилями.
export interface ITextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikeThrough: boolean;
  link?: string;
  color?: string;
  highlight?: string;
}

// Логическая строка текста: набор run-ов плюс опциональный list-marker.
export interface ITextLine {
  runs: ITextRun[];
  listType?: "bullet" | "number" | "letter";
  listLevel?: number;
}

// Визуальная строка после wrap-лейаута.
export interface IVisualLine {
  runs: ITextRun[];
  listType?: "bullet" | "number" | "letter";
  listLevel?: number;
  // Текст маркера (например "1. ", "• "). Ставится только на первой визуальной
  // строке логической; продолжения wrap наследуют listLevel для отступа.
  markerText?: string;
}

// Параметры лейаута rich-text.
export interface ILayoutOpts {
  fontFamily: string;
  // Если задано, текст переносится по словам (или per-character при overflow). Иначе одна строка.
  maxWidth?: number;
  // Множитель высоты строки относительно fontSize.
  lineHeight: number;
}

// Результат лейаута: визуальные строки после wrap, общая высота и максимальная ширина.
export interface ILayoutResult {
  visual: IVisualLine[];
  totalHeight: number;
  maxWidth: number;
}

// Отступ слева на каждый уровень вложенности списка (в CSS-пикселях).
export const LIST_LEVEL_INDENT = 16;

// Singleton-канвас 1x1 для measureText. Создаётся лениво при первом обращении,
// чтобы не плодить DOM-узлы.
let metricsCtx: CanvasRenderingContext2D | null = null;
export function getMetricsCtx(): CanvasRenderingContext2D {
  if (!metricsCtx) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    metricsCtx = canvas.getContext("2d")!;
  }
  return metricsCtx;
}

// Маркер строки списка по типу: number даёт "1. ", letter даёт "a. ", остальное "• ".
export function getListMarker(type: string, index: number): string {
  switch (type) {
    case "number":
      return `${index + 1}. `;
    case "letter":
      return `${String.fromCharCode(97 + (index % 26))}. `;
    default:
      return "• ";
  }
}

// Строит font-spec для canvas из размера и опциональных bold/italic.
export function makeFont(
  fontSize: number,
  bold = false,
  italic = false,
): string {
  const weight = bold ? "bold " : "";
  const style = italic ? "italic " : "";
  return `${style}${weight}${fontSize}px ${TEXT_FONT_FAMILY}`;
}

// Парсит HTML-строку из contenteditable в ITextLine[].
// Поддерживает div-structure (новый формат) и legacy-формат через walkLegacy.
// SSR-fallback: возвращает одну пустую строку если document недоступен.
export function htmlToLines(html: string): ITextLine[] {
  if (typeof document === "undefined") {
    return [
      {
        runs: [
          {
            text: "",
            bold: false,
            italic: false,
            underline: false,
            strikeThrough: false,
          },
        ],
      },
    ];
  }
  const container = document.createElement("div");
  container.innerHTML = html;
  const topChildren = Array.from(container.childNodes);
  const hasDivStructure = topChildren.some(
    (node) => (node as Element).tagName === "DIV",
  );
  const lines: ITextLine[] = [];

  // Walker для div-structure формата. Каждый div = логическая строка, br внутри
  // разделяет на визуальные строки (хотя breakOnBr тут отключён).
  function walkInline(
    nodes: NodeListOf<ChildNode>,
    bold: boolean,
    italic: boolean,
    underline: boolean,
    strikeThrough: boolean,
    targetRuns: ITextRun[],
    breakOnBr = true,
    link?: string,
    color?: string,
    highlight?: string,
  ): void {
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent ?? "";
        if (!text) continue;
        const parts = text.split("\n");
        for (let p = 0; p < parts.length; p++) {
          if (p > 0) {
            const newLine: ITextLine = { runs: [] };
            lines.push(newLine);
            targetRuns = newLine.runs;
          }
          if (parts[p]) {
            targetRuns.push({
              text: parts[p],
              bold,
              italic,
              underline,
              strikeThrough,
              link,
              color,
              highlight,
            });
          }
        }
        continue;
      }
      const element = node as Element;
      if (!element.tagName) continue;
      const tag = element.tagName.toLowerCase();
      if (tag === "br") {
        if (breakOnBr) {
          const newLine: ITextLine = { runs: [] };
          lines.push(newLine);
          targetRuns = newLine.runs;
        }
        continue;
      }
      const elStyle = (element as HTMLElement).style;
      const fwVal = elStyle?.fontWeight ?? "";
      const fwBold =
        fwVal === "bold" ||
        fwVal === "bolder" ||
        (fwVal !== "" && parseInt(fwVal) >= 600);
      const nextBold = bold || tag === "b" || tag === "strong" || fwBold;
      const cssItalic = elStyle?.fontStyle === "italic";
      const nextItalic = italic || tag === "i" || tag === "em" || cssItalic;
      const tdVal = elStyle?.textDecoration ?? "";
      const nextUnderline = underline || tag === "u" || tdVal.includes("underline");
      const nextStrike =
        strikeThrough ||
        tag === "s" ||
        tag === "strike" ||
        tag === "del" ||
        tdVal.includes("line-through");
      const nextLink =
        link ??
        (tag === "a"
          ? ((element as HTMLAnchorElement).getAttribute("href") ?? undefined)
          : undefined);
      let nextColor = color;
      if (tag === "font") {
        const fontColor = (element as HTMLElement).getAttribute("color");
        if (fontColor) nextColor = fontColor;
      }
      if (tag === "span" || tag === "font") {
        const styleColor = elStyle?.color;
        if (styleColor) nextColor = styleColor;
      }
      let nextHighlight = highlight;
      if (tag === "span" || tag === "font" || tag === "mark") {
        const bg = elStyle?.backgroundColor;
        if (bg) nextHighlight = bg;
      }
      walkInline(
        element.childNodes,
        nextBold,
        nextItalic,
        nextUnderline,
        nextStrike,
        targetRuns,
        breakOnBr,
        nextLink,
        nextColor,
        nextHighlight,
      );
    }
  }

  if (hasDivStructure) {
    for (const node of topChildren) {
      const element = node as Element;
      if (element.tagName !== "DIV") {
        if (lines.length === 0) lines.push({ runs: [] });
        const target = lines[lines.length - 1];
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent ?? "";
          if (text) {
            target.runs.push({
              text,
              bold: false,
              italic: false,
              underline: false,
              strikeThrough: false,
            });
          }
        } else if (element.tagName) {
          const tag = element.tagName.toLowerCase();
          const linkHref =
            tag === "a" ? (element.getAttribute("href") ?? undefined) : undefined;
          walkInline(
            element.childNodes,
            false,
            false,
            false,
            false,
            target.runs,
            false,
            linkHref,
          );
        }
        continue;
      }
      const divEl = element as HTMLElement;
      const listType = divEl.dataset.liType as
        | "bullet"
        | "number"
        | "letter"
        | undefined;
      const listLevel = listType
        ? parseInt(divEl.dataset.liLevel ?? "0")
        : undefined;
      const newLine: ITextLine = { runs: [], listType, listLevel };
      lines.push(newLine);
      const divColor = divEl.style.color || undefined;
      walkInline(
        divEl.childNodes,
        false,
        false,
        false,
        false,
        newLine.runs,
        false,
        undefined,
        divColor,
      );
    }
    return lines;
  }

  // Legacy path: старый формат без div-структуры. br/p/div тоже разделяют строки.
  const firstLine: ITextLine = { runs: [] };
  lines.push(firstLine);
  function walkLegacy(
    node: ChildNode,
    bold: boolean,
    italic: boolean,
    underline: boolean,
    strikeThrough: boolean,
    link?: string,
    color?: string,
    highlight?: string,
  ): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (!text) return;
      const parts = text.split("\n");
      for (let p = 0; p < parts.length; p++) {
        if (p > 0) lines.push({ runs: [] });
        if (parts[p]) {
          lines[lines.length - 1].runs.push({
            text: parts[p],
            bold,
            italic,
            underline,
            strikeThrough,
            link,
            color,
            highlight,
          });
        }
      }
      return;
    }
    const element = node as Element;
    if (!element.tagName) return;
    const tag = element.tagName.toLowerCase();
    if (tag === "br") {
      lines.push({ runs: [] });
      return;
    }
    if (
      (tag === "div" || tag === "p") &&
      lines[lines.length - 1].runs.length > 0
    ) {
      lines.push({ runs: [] });
    }
    const legacyStyle = (element as HTMLElement).style;
    const nextBold = bold || tag === "b" || tag === "strong";
    const nextItalic = italic || tag === "i" || tag === "em";
    const legacyTd = legacyStyle?.textDecoration ?? "";
    const nextUnderline = underline || tag === "u" || legacyTd.includes("underline");
    const nextStrike =
      strikeThrough ||
      tag === "s" ||
      tag === "strike" ||
      tag === "del" ||
      legacyTd.includes("line-through");
    const nextLink =
      link ??
      (tag === "a"
        ? ((element as HTMLAnchorElement).getAttribute("href") ?? undefined)
        : undefined);
    let nextColor = color;
    if (tag === "font") {
      const fontColor = (element as HTMLElement).getAttribute("color");
      if (fontColor) nextColor = fontColor;
    }
    if (tag === "span" || tag === "font") {
      const styleColor = (element as HTMLElement).style?.color;
      if (styleColor) nextColor = styleColor;
    }
    let nextHighlight = highlight;
    if (tag === "span" || tag === "font" || tag === "mark") {
      const bg = (element as HTMLElement).style?.backgroundColor;
      if (bg) nextHighlight = bg;
    }
    for (const child of element.childNodes) {
      walkLegacy(
        child,
        nextBold,
        nextItalic,
        nextUnderline,
        nextStrike,
        nextLink,
        nextColor,
        nextHighlight,
      );
    }
  }
  for (const child of container.childNodes) {
    walkLegacy(child, false, false, false, false);
  }
  return lines;
}

// Wrap логических строк в визуальные с учётом maxWidth.
// Поддерживает word-wrap, per-character split при overflow одного слова,
// маркеры списков и отступы по уровню вложенности.
export function layoutRichLines(
  lines: ITextLine[],
  fontSize: number,
  opts: ILayoutOpts,
): ILayoutResult {
  const ctx = getMetricsCtx();
  const lineHeight = fontSize * opts.lineHeight;
  const result: IVisualLine[] = [];
  let maxLineWidth = 0;

  // Counters для number-списков, отслеживание перехода между секциями.
  const counters: Record<string, number> = {};
  let prevType: string | undefined;

  for (const line of lines) {
    const listType = line.listType;
    const listLevel = line.listLevel ?? 0;
    const indent = listType ? listLevel * LIST_LEVEL_INDENT : 0;
    if (listType === "number" && prevType !== "number") {
      counters[`number:${listLevel}`] = 0;
    }
    prevType = listType;

    let markerWidth = 0;
    let markerText: string | undefined;
    if (listType) {
      const key = `${listType}:${listLevel}`;
      counters[key] = (counters[key] ?? 0) + 1;
      markerText = getListMarker(listType, counters[key] - 1);
      ctx.font = makeFont(fontSize);
      markerWidth = ctx.measureText(markerText).width;
    }

    // Для wrap-расчёта вычитаем зарезервированное место (отступ + маркер).
    const reserved = indent + markerWidth;
    const effectiveMax =
      opts.maxWidth !== undefined
        ? Math.max(0, opts.maxWidth - reserved)
        : Infinity;

    type Token = { text: string; isSpace: boolean; run: ITextRun };
    const tokens: Token[] = [];
    for (const run of line.runs) {
      if (!run.text) continue;
      const parts = run.text.split(/(\s+)/);
      for (const part of parts) {
        if (part === "") continue;
        tokens.push({ text: part, isSpace: /^\s+$/.test(part), run });
      }
    }

    const linesForAuthor: IVisualLine[] = [];
    let curRuns: ITextRun[] = [];
    let curWidth = 0;

    // Маркер ставится только на первую визуальную строку логической, продолжения наследуют indent.
    const pushCurrent = (): void => {
      const isFirst = linesForAuthor.length === 0;
      linesForAuthor.push({
        runs: curRuns,
        listType: listType && isFirst ? listType : undefined,
        listLevel: listType ? listLevel : undefined,
        markerText: listType && isFirst ? markerText : undefined,
      });
      curRuns = [];
      curWidth = 0;
    };

    for (const token of tokens) {
      ctx.font = makeFont(fontSize, token.run.bold, token.run.italic);
      const tokenWidth = ctx.measureText(token.text).width;

      if (opts.maxWidth === undefined) {
        mergeRun(curRuns, token);
        curWidth += tokenWidth;
        continue;
      }

      // Слово шире колонки. Ломаем посимвольно.
      // Эту проверку ДОЛЖНУ ДЕЛАТЬ ДО fits-теста: иначе огромный первый
      // токен на пустой строке проходит как-есть и потом вылезает за clip-rect при рендере.
      if (tokenWidth > effectiveMax && !token.isSpace) {
        if (curRuns.length > 0) pushCurrent();
        let i = 0;
        while (i < token.text.length) {
          let j = i + 1;
          let bestJ = i + 1;
          let bestWidth = 0;
          while (j <= token.text.length) {
            const sliceWidth = ctx.measureText(token.text.slice(i, j)).width;
            if (sliceWidth > effectiveMax) break;
            bestJ = j;
            bestWidth = sliceWidth;
            j++;
          }
          mergeRun(curRuns, { text: token.text.slice(i, bestJ), run: token.run });
          curWidth = bestWidth;
          i = bestJ;
          if (i < token.text.length) pushCurrent();
        }
        continue;
      }

      const fits = curWidth + tokenWidth <= effectiveMax || curRuns.length === 0;
      if (fits) {
        // Пробел в начале строки игнорируем (артефакт переноса).
        if (token.isSpace && curRuns.length === 0) continue;
        mergeRun(curRuns, token);
        curWidth += tokenWidth;
        continue;
      }

      pushCurrent();
      if (token.isSpace) continue;
      mergeRun(curRuns, token);
      curWidth = tokenWidth;
    }
    if (curRuns.length > 0 || linesForAuthor.length === 0) pushCurrent();

    // Считаем максимальную фактическую ширину для bbox.
    for (const visualLine of linesForAuthor) {
      let width = reserved;
      for (const run of visualLine.runs) {
        ctx.font = makeFont(fontSize, run.bold, run.italic);
        width += ctx.measureText(run.text).width;
      }
      if (width > maxLineWidth) maxLineWidth = width;
    }
    result.push(...linesForAuthor);
  }

  const totalHeight = Math.max(1, result.length) * lineHeight;
  return {
    visual: result,
    totalHeight,
    maxWidth: maxLineWidth + TEXT_BBOX_PAD_PX,
  };
}

// Сливает токен с последним run если стили совпадают, иначе создаёт новый run.
function mergeRun(
  runs: ITextRun[],
  token: { text: string; run: ITextRun },
): void {
  const last = runs[runs.length - 1];
  if (last && sameStyle(last, token.run)) {
    last.text += token.text;
    return;
  }
  runs.push({ ...token.run, text: token.text });
}

// Сравнивает стили двух runs: совпадают ли все форматные поля.
function sameStyle(a: ITextRun, b: ITextRun): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikeThrough === b.strikeThrough &&
    a.link === b.link &&
    a.color === b.color &&
    a.highlight === b.highlight
  );
}
