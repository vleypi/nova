import {
  DEFAULT_TEXT_COLOR,
  HANDLE_RADIUS,
  TEXT_FONT_FAMILY,
  TEXT_OVERLAY_Z_INDEX,
  TEXT_HANDLE_Z_INDEX,
  TEXT_BORDER_COLOR,
  TEXT_HANDLE_BG,
  TEXT_HANDLE_STROKE,
  TEXT_OVERLAY_STROKE_W,
  TEXT_PLACEHOLDER,
} from "@/features/board/constants/board.constant";
import { normalizeHtmlToDivLines, setEditableDivLines } from "./editor.text-utils";

const EDITOR_CLASS = "nova-text-editor";
const PLACEHOLDER_STYLE_ID = "__nova-text-ph";
const LIST_STYLE_ID = "__nova-text-list";
const LINK_STYLE_ID = "__nova-text-link";
const SELECTION_STYLE_ID = "__nova-text-sel";
const HIGHLIGHT_STYLE_ID = "__nova-text-hl";
const EMPTY_EDITABLE_HTML = "<div><br></div>";
const UNDERLINE_THICKNESS_FACTOR = 0.08;
const UNDERLINE_OFFSET_FACTOR = 0.12;
const MIN_UNDERLINE_THICKNESS_PX = 1;

// Объединяет CSS-декларации в строку для style.cssText.
function joinStyles(declarations: string[]): string {
  return declarations.join(";");
}

// Создаёт <style>-тег с заданным id и текстом, если такого ещё нет в head.
function ensureStyleTag(styleId: string, cssText: string): void {
  if (document.getElementById(styleId)) return;
  const styleElement = document.createElement("style");
  styleElement.id = styleId;
  styleElement.textContent = cssText;
  document.head.appendChild(styleElement);
}

// Создаёт скрытый span для измерения ширины текста в текущем зуме.
export function createMeasurer(
  zoomedFontSize: number,
  zoomedLineH: number,
): HTMLSpanElement {
  const measurer = document.createElement("span");
  measurer.style.cssText = joinStyles([
    "position:fixed",
    "visibility:hidden",
    "white-space:pre",
    `font-family:${TEXT_FONT_FAMILY}`,
    `font-size:${zoomedFontSize}px`,
    `line-height:${zoomedLineH}px`,
    "padding:0",
    "pointer-events:none",
  ]);
  return measurer;
}

// Создаёт скрытый div для измерения многострочного блока редактора.
export function createMeasureDiv(
  zoomedFontSize: number,
  zoomedLineH: number,
): HTMLDivElement {
  const measureDiv = document.createElement("div");
  measureDiv.className = EDITOR_CLASS;
  measureDiv.style.cssText = joinStyles([
    "position:fixed",
    "visibility:hidden",
    "pointer-events:none",
    "display:inline-block",
    "white-space:pre-wrap",
    `font-family:${TEXT_FONT_FAMILY}`,
    `font-size:${zoomedFontSize}px`,
    `line-height:${zoomedLineH}px`,
    "letter-spacing:normal",
    "word-spacing:normal",
    "padding:0",
    "margin:0",
    "border:none",
  ]);
  return measureDiv;
}

// Создаёт рамку оверлея редактора с двойной обводкой по периметру.
export function createFrame(sx: number, sy: number): HTMLDivElement {
  const halfStrokeWidth = TEXT_OVERLAY_STROKE_W / 2;
  const frame = document.createElement("div");
  frame.style.cssText = joinStyles([
    "position:fixed",
    `left:${sx}px`,
    `top:${sy}px`,
    "padding:0",
    "border:none",
    "outline:none",
    `box-shadow:0 0 0 ${halfStrokeWidth}px ${TEXT_BORDER_COLOR},inset 0 0 0 ${halfStrokeWidth}px ${TEXT_BORDER_COLOR}`,
    "box-sizing:content-box",
    "overflow:visible",
    `z-index:${TEXT_OVERLAY_Z_INDEX}`,
  ]);
  return frame;
}

// Создаёт contenteditable-блок редактора с начальным html или plain-текстом.
// withPlaceholder=false скрывает серый плейсхолдер (sticky/shape: пустой бокс выглядит чище).
export function createEditable(
  zoomedFontSize: number,
  zoomedLineH: number,
  initialText?: string,
  initialHtml?: string,
  withPlaceholder: boolean = true,
): HTMLDivElement {
  const editable = document.createElement("div");
  editable.contentEditable = "true";
  editable.className = EDITOR_CLASS;
  const underlineThickness = Math.max(
    MIN_UNDERLINE_THICKNESS_PX,
    zoomedFontSize * UNDERLINE_THICKNESS_FACTOR,
  );
  // text-underline-offset зеркалит RICH_UNDERLINE_OFFSET_FACTOR из canvas (0.12),
  // чтобы подчёркивание в редакторе и на canvas стояло на одной высоте.
  const underlineOffset = Math.max(1, zoomedFontSize * UNDERLINE_OFFSET_FACTOR);
  editable.style.cssText = joinStyles([
    "display:block",
    `font-family:${TEXT_FONT_FAMILY}`,
    `font-size:${zoomedFontSize}px`,
    `line-height:${zoomedLineH}px`,
    `color:${DEFAULT_TEXT_COLOR}`,
    "background:transparent",
    "border:none",
    "outline:none",
    "white-space:pre-wrap",
    "word-break:break-word",
    "letter-spacing:normal",
    "word-spacing:normal",
    "margin:0",
    "min-width:4px",
    `min-height:${zoomedLineH}px`,
    "box-sizing:content-box",
    "cursor:text",
    `caret-color:${DEFAULT_TEXT_COLOR}`,
    "text-decoration-skip-ink:none",
    `text-decoration-thickness:${underlineThickness}px`,
    `text-underline-offset:${underlineOffset}px`,
  ]);
  if (withPlaceholder) {
    editable.setAttribute("data-placeholder", TEXT_PLACEHOLDER);
  }
  if (initialHtml) {
    editable.innerHTML = normalizeHtmlToDivLines(initialHtml);
  } else if (initialText) {
    setEditableDivLines(editable, initialText);
  } else {
    editable.innerHTML = EMPTY_EDITABLE_HTML;
  }
  return editable;
}

// Внедряет в head глобальные стили: плейсхолдер, маркеры списков, ссылки, выделение.
export function injectOverlayStyles(): void {
  ensureStyleTag(
    PLACEHOLDER_STYLE_ID,
    [
      "[data-placeholder]:empty,",
      "[data-placeholder]:has(div:only-child>br:only-child){position:relative}",
      "[data-placeholder]:empty::before,",
      "[data-placeholder]:has(div:only-child>br:only-child)::before{",
      "content:attr(data-placeholder);color:#999;pointer-events:none;",
      "white-space:pre;position:absolute;top:0;left:0;user-select:none;z-index:-1}",
    ].join(""),
  );

  // Маркеры списков рендерятся через `::before` с **position: absolute**, чтобы
  // не быть частью inline-content (как в стандартном CSS): иначе при text-align: center
  // маркер уезжал бы в центр строки вместе с текстом, а в canvas маркер всегда
  // прижат к indent-краю → визуальное расхождение между edit и render.
  //
  // padding-left и --marker-left каждый list-div получает динамически от
  // TextEditorOverlay.syncListMarkers (на текущем zoomedFontSize), потому что
  // markerWidth и indent зависят и от шрифта, и от zoom — статикой не покрыть.
  ensureStyleTag(
    LIST_STYLE_ID,
    [
      `.${EDITOR_CLASS} div[data-li-type]{position:relative}`,
      `.${EDITOR_CLASS} div[data-li-type]::before{`,
      "position:absolute;left:var(--marker-left,0);top:0;",
      "pointer-events:none;user-select:none}",
      `.${EDITOR_CLASS} div[data-li-type="bullet"]::before{content:"• "}`,
      `.${EDITOR_CLASS} div[data-li-type="number"]::before{content:attr(data-li-index) ". "}`,
      `.${EDITOR_CLASS} div[data-li-type="letter"]::before{content:attr(data-li-marker) ". "}`,
    ].join(""),
  );

  ensureStyleTag(
    LINK_STYLE_ID,
    "[contenteditable] a{color:#4262ff;text-decoration:underline;cursor:pointer}",
  );

  ensureStyleTag(
    SELECTION_STYLE_ID,
    "[contenteditable]::selection,\n[contenteditable] *::selection{background:rgba(66,98,255,0.15);color:inherit}",
  );

  // box-decoration-break: clone — на wrap-границе каждый «кусок» strip-фоном получает
  // свой box, иначе границы highlight'а в редакторе после wrap отличаются от canvas-render.
  ensureStyleTag(
    HIGHLIGHT_STYLE_ID,
    `.${EDITOR_CLASS} span{box-decoration-break:clone;-webkit-box-decoration-break:clone}`,
  );
}

// Параметры старта ресайза, передаваемые в onStart-колбэк ручки.
export interface IResizeStartInfo {
  handleIdx: number;
  clientX: number;
  clientY: number;
}

// Колбэки жизненного цикла перетаскивания угловой ручки.
export interface ICornerHandleCallbacks {
  onStart: (info: IResizeStartInfo) => void;
  onMove: (clientX: number, clientY: number) => void;
  onEnd: () => void;
}

const HANDLE_POSITIONS = [
  "top:0;left:0",
  "top:0;right:0",
  "bottom:0;left:0",
  "bottom:0;right:0",
];

const HANDLE_TRANSFORMS = [
  "translate(-50%,-50%)",
  "translate(50%,-50%)",
  "translate(-50%,50%)",
  "translate(50%,50%)",
];

const HANDLE_CURSORS = ["nwse-resize", "nesw-resize", "nesw-resize", "nwse-resize"];
const CORNER_COUNT = 4;

// Создаёт DOM-узел одной угловой ручки с зафиксированными размерами и стилями.
function createCornerHandle(cornerIndex: number, innerSize: number): HTMLDivElement {
  const handle = document.createElement("div");
  handle.style.cssText = joinStyles([
    "position:absolute",
    HANDLE_POSITIONS[cornerIndex],
    `transform:${HANDLE_TRANSFORMS[cornerIndex]}`,
    `width:${innerSize}px`,
    `height:${innerSize}px`,
    "border-radius:50%",
    `background:${TEXT_HANDLE_BG}`,
    `border:${TEXT_OVERLAY_STROKE_W}px solid ${TEXT_HANDLE_STROKE}`,
    `cursor:${HANDLE_CURSORS[cornerIndex]}`,
    `z-index:${TEXT_HANDLE_Z_INDEX}`,
    "box-sizing:content-box",
  ]);
  return handle;
}

// Навешивает pointer-обработчики ручки и связывает их с колбэками жизненного цикла.
function bindCornerHandlePointer(
  handle: HTMLDivElement,
  handleIdx: number,
  callbacks: ICornerHandleCallbacks,
): void {
  let dragging = false;

  handle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    dragging = true;
    callbacks.onStart({ handleIdx, clientX: event.clientX, clientY: event.clientY });
  });

  handle.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    callbacks.onMove(event.clientX, event.clientY);
  });

  const finish = (): void => {
    if (!dragging) return;
    dragging = false;
    callbacks.onEnd();
  };

  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);
  handle.addEventListener("lostpointercapture", finish);
}

// Создаёт четыре угловые ручки внутри рамки и связывает их с колбэками ресайза.
export function attachCornerHandles(
  frame: HTMLDivElement,
  callbacks: ICornerHandleCallbacks,
): void {
  const innerSize = HANDLE_RADIUS * 2 - TEXT_OVERLAY_STROKE_W;
  for (let i = 0; i < CORNER_COUNT; i++) {
    const handle = createCornerHandle(i, innerSize);
    bindCornerHandlePointer(handle, i, callbacks);
    frame.appendChild(handle);
  }
}
