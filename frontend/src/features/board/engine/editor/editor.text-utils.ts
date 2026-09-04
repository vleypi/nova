const EMPTY_DIV_LINE = "<div><br></div>";

const ALLOWED_INLINE_TAGS = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "DEL",
  "STRIKE",
  "A",
  "SPAN",
  "FONT",
  "BR",
]);

const BLOCK_LEVEL_TAGS = new Set([
  "DIV",
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "OL",
  "UL",
  "BLOCKQUOTE",
  "PRE",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "TR",
  "TD",
  "TH",
  "DT",
  "DD",
  "FIGURE",
  "FIGCAPTION",
  "NAV",
  "MAIN",
  "ASIDE",
]);

const STRIPPED_PASTE_SELECTOR =
  "script,style,meta,link,iframe,object,embed,form,input,textarea,select,button,img,video,audio,canvas,svg,table,thead,tbody,tfoot,colgroup,col";

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/;
const RGB_COLOR_RE = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
const SAFE_HREF_RE = /^https?:\/\//i;
// FONT color-атрибут принимает named colors и 3/6-hex без #. Сужаем до hex-формата.
const FONT_COLOR_ATTR_RE = /^#?[0-9a-fA-F]{3,8}$/;

// Возвращает значение цвета только если оно похоже на hex или rgb(), иначе null.
// Гасит CSS-инъекции вида "url(...)", "expression(...)", multi-value, calc().
function safeColorValue(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (HEX_COLOR_RE.test(trimmed)) return trimmed;
  if (RGB_COLOR_RE.test(trimmed)) return trimmed;
  return null;
}

function getElementTag(node: Node): string | null {
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  return (node as Element).tagName;
}

function rgbChannelToHex(channel: string): string {
  return parseInt(channel, 10).toString(16).padStart(2, "0");
}

// Преобразует произвольный HTML в последовательность <div>-строк, понятных редактору.
export function normalizeHtmlToDivLines(html: string): string {
  if (!html || !html.trim()) return EMPTY_DIV_LINE;

  const container = document.createElement("div");
  container.innerHTML = html;

  const topChildren = Array.from(container.childNodes);
  const hasDivStructure = topChildren.some((node) => getElementTag(node) === "DIV");
  if (hasDivStructure) return html;

  const lineHtmls: string[] = [];
  let currentLine = document.createElement("div");

  const flushLine = () => {
    lineHtmls.push(currentLine.innerHTML || "");
    currentLine = document.createElement("div");
  };

  for (const node of topChildren) {
    if (getElementTag(node) === "BR") {
      flushLine();
      continue;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const parts = (node.textContent ?? "").split("\n");
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) flushLine();
        if (parts[i]) currentLine.appendChild(document.createTextNode(parts[i]));
      }
      continue;
    }

    currentLine.appendChild(node.cloneNode(true));
  }
  flushLine();

  return lineHtmls.map((lineHtml) => `<div>${lineHtml || "<br>"}</div>`).join("");
}

// Возвращает plain-текст editable: по одной строке на каждый top-level div,
// разделённые \n. НЕ использует innerText — innerText игнорирует user-select:none
// для CSS ::before list-маркеров, и они попадали бы в plain-text как символы
// ("• item1\nitem2") вместо "item1\nitem2". Через textContent ::before content
// не учитывается, что и нужно.
export function getEditableText(element: HTMLElement): string {
  const lines: string[] = [];
  for (const child of Array.from(element.children)) {
    if (getElementTag(child) === "DIV") {
      lines.push((child as HTMLDivElement).textContent ?? "");
    }
  }
  // Fallback на случай editable без div-структуры (только текст или br'ы).
  if (lines.length === 0) return element.textContent ?? "";
  return lines.join("\n");
}

// Раскладывает plain text по <div>-строкам внутри редактируемого элемента.
export function setEditableDivLines(element: HTMLElement, text: string): void {
  element.innerHTML = "";
  const lines = text.split("\n");
  for (const line of lines) {
    const lineDiv = document.createElement("div");
    if (line) {
      lineDiv.textContent = line;
    } else {
      lineDiv.innerHTML = "<br>";
    }
    element.appendChild(lineDiv);
  }
}

function copyAllowedAttributes(source: Element, target: Element): void {
  const tag = source.tagName;

  if (tag === "A") {
    const href = source.getAttribute("href") || "";
    if (SAFE_HREF_RE.test(href)) {
      target.setAttribute("href", href);
      // Внешние ссылки всегда новой вкладкой + rel чтобы предотвратить reverse-tabnabbing.
      target.setAttribute("target", "_blank");
      target.setAttribute("rel", "noopener noreferrer");
    }
    return;
  }

  if (tag === "SPAN" || tag === "FONT") {
    const sourceStyle = (source as HTMLElement).style;
    const targetStyle = (target as HTMLElement).style;
    // Валидация color/backgroundColor через regex — иначе можно протащить CSS-инъекцию
    // (url(), expression(), множественные значения и т.п.).
    const safeColor = safeColorValue(sourceStyle?.color);
    if (safeColor) targetStyle.color = safeColor;
    const safeBg = safeColorValue(sourceStyle?.backgroundColor);
    if (safeBg) targetStyle.backgroundColor = safeBg;
    const fontColorAttr = source.getAttribute("color");
    if (fontColorAttr && FONT_COLOR_ATTR_RE.test(fontColorAttr)) {
      target.setAttribute("color", fontColorAttr);
    }
  }
}

function sanitizeNodeRecursive(node: Node): Node[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ? [document.createTextNode(node.textContent)] : [];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const element = node as Element;
  const tag = element.tagName;

  if (BLOCK_LEVEL_TAGS.has(tag)) {
    const wrapper = document.createElement("div");
    appendSanitizedChildren(element, wrapper);
    return [wrapper];
  }

  if (ALLOWED_INLINE_TAGS.has(tag)) {
    if (tag === "BR") return [document.createElement("br")];
    const clone = document.createElement(tag);
    copyAllowedAttributes(element, clone);
    appendSanitizedChildren(element, clone);
    return [clone];
  }

  const flattened: Node[] = [];
  for (const child of Array.from(element.childNodes)) {
    flattened.push(...sanitizeNodeRecursive(child));
  }
  return flattened;
}

function appendSanitizedChildren(source: Element, target: Element): void {
  for (const child of Array.from(source.childNodes)) {
    sanitizeNodeRecursive(child).forEach((sanitized) => target.appendChild(sanitized));
  }
}

// Чистит вставленный HTML от опасных тегов и приводит его к div-строкам.
export function sanitizePastedHtml(rawHtml: string): string {
  const container = document.createElement("div");
  container.innerHTML = rawHtml;
  container.querySelectorAll(STRIPPED_PASTE_SELECTOR).forEach((element) => element.remove());

  const result = document.createElement("div");
  appendSanitizedChildren(container, result);

  const html = result.innerHTML;
  if (!html.trim()) return "";
  return normalizeHtmlToDivLines(html);
}

// Парсит "#rrggbb" или "rgb(r, g, b)" и возвращает hex в нижнем регистре.
export function rgbToHex(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (HEX_COLOR_RE.test(trimmed)) return trimmed;

  const match = trimmed.match(RGB_COLOR_RE);
  if (!match) return null;

  return `#${rgbChannelToHex(match[1])}${rgbChannelToHex(match[2])}${rgbChannelToHex(match[3])}`;
}

// Возвращает родительский top-level div для произвольной node внутри editable.
// Используется когда нужно сопоставить произвольную точку селекции (range.startContainer
// или endContainer) с её "строкой" в editor-структуре.
export function findContainingDiv(
  node: Node,
  editable: HTMLElement,
): HTMLDivElement | null {
  let n: Node | null = node;
  while (n && n !== editable) {
    if (
      n.parentNode === editable &&
      n.nodeType === Node.ELEMENT_NODE &&
      (n as Element).tagName === "DIV"
    ) {
      return n as HTMLDivElement;
    }
    n = n.parentNode;
  }
  return null;
}

// Возвращает <div>-строку, в которой сейчас находится курсор внутри editable.
export function getCurrentDiv(editable: HTMLElement): HTMLDivElement | null {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  let node: Node | null = range.startContainer;

  while (node && node !== editable) {
    if (node.parentNode === editable && getElementTag(node) === "DIV") {
      return node as HTMLDivElement;
    }
    node = node.parentNode;
  }

  if (node === editable) {
    const offset = range.startOffset;
    const children = editable.childNodes;
    for (let i = Math.min(offset, children.length) - 1; i >= 0; i--) {
      if (getElementTag(children[i]) === "DIV") {
        return children[i] as HTMLDivElement;
      }
    }
  }

  const directDivs = editable.querySelectorAll(":scope > div");
  if (directDivs.length === 0) return null;
  return directDivs[directDivs.length - 1] as HTMLDivElement;
}
