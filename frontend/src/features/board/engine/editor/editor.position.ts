import {
  EDITOR_MIN_CONTENT_WIDTH_PX,
  EDITOR_PLACEHOLDER_WIDTH_PAD_PX,
  EDITOR_TEXT_FRAME_PAD_WORLD_PX,
  STICKY_CORNER_RADIUS,
  STICKY_PADDING,
  STICKY_SHADOW_ALPHA,
  STICKY_SHADOW_BLUR,
  STICKY_SHADOW_Y_OFFSET,
  TEXT_FONT_FAMILY,
  TEXT_LINE_HEIGHT,
  TEXT_PLACEHOLDER,
} from "@/features/board/constants/board.constant";
import { TEXT_TOOLBAR_GAP } from "@/features/board/constants/text-toolbar.constant";
import { Camera } from "@engine/core/Camera";
import { measureEditableLayout } from "@engine/elements/shared/editable-layout";
import { pickTextColor } from "@engine/utils/contrast";
import { getEditableText } from "@engine/editor/editor.text-utils";
import { TextEditorToolbarAdapter } from "@engine/editor/TextEditorToolbarAdapter";

// Ссылки на DOM-элементы inline-редактора и его панели инструментов.
export interface ITextSyncRefs {
  frame: HTMLDivElement | null;
  editable: HTMLDivElement | null;
  measurer: HTMLSpanElement | null;
  measureDiv: HTMLDivElement | null;
  toolbar: TextEditorToolbarAdapter | null;
}

// Текущее состояние редактируемого текста: позиция в мире, размер шрифта, выравнивание.
export interface ITextSyncState {
  worldPos: { x: number; y: number };
  fontSize: number;
  textAlign: "left" | "center" | "right";
}

// Применяет к editable стили, согласованные с canvas-рендером.
function applyEditableTypography(
  editable: HTMLDivElement,
  zoomedFontSize: number,
  zoomedLineHeight: number,
  textAlign: ITextSyncState["textAlign"],
): void {
  editable.style.fontSize = `${zoomedFontSize}px`;
  editable.style.lineHeight = `${zoomedLineHeight}px`;
  editable.style.textAlign = textAlign;
}

// Позиционирует тулбар по центру верхней границы рамки.
function positionToolbar(
  toolbar: TextEditorToolbarAdapter | null,
  centerScreenX: number,
  topScreenY: number,
  fontSize: number,
): void {
  toolbar?.syncPosition(centerScreenX, topScreenY - TEXT_TOOLBAR_GAP, fontSize);
}

// Синхронизирует позицию и размеры рамки текстового редактора со state и камерой.
export function syncTextFrame(
  refs: ITextSyncRefs,
  state: ITextSyncState,
  camera: Camera,
  html: string,
): void {
  const { frame, editable, measurer, toolbar } = refs;
  if (!frame || !editable || !measurer) return;

  const { sx, sy } = camera.worldToScreen(state.worldPos.x, state.worldPos.y);
  const zoomedFontSize = state.fontSize * camera.zoom;
  const zoomedLineHeight = zoomedFontSize * TEXT_LINE_HEIGHT;

  applyEditableTypography(editable, zoomedFontSize, zoomedLineHeight, state.textAlign);
  editable.style.minHeight = `${zoomedLineHeight}px`;
  measurer.style.fontSize = `${zoomedFontSize}px`;
  measurer.style.lineHeight = `${zoomedLineHeight}px`;

  // Та же math, что и в canvas-пути (htmlToLines + layoutRichLines), чтобы не было прыжка на коммит.
  const measured = measureEditableLayout(html, zoomedFontSize, TEXT_FONT_FAMILY);
  let contentWidth = measured.width;
  if (contentWidth <= EDITOR_MIN_CONTENT_WIDTH_PX) {
    measurer.textContent = TEXT_PLACEHOLDER;
    contentWidth = Math.max(
      EDITOR_MIN_CONTENT_WIDTH_PX,
      measurer.offsetWidth + EDITOR_PLACEHOLDER_WIDTH_PAD_PX,
    );
  }

  const padPx = EDITOR_TEXT_FRAME_PAD_WORLD_PX * camera.zoom;
  editable.style.width = `${contentWidth}px`;
  editable.style.height = `${Math.max(zoomedLineHeight, measured.height)}px`;
  editable.style.padding = `0 ${padPx}px`;
  frame.style.left = `${sx - padPx}px`;
  frame.style.top = `${sy}px`;
  frame.style.width = `${contentWidth + padPx * 2}px`;

  positionToolbar(
    toolbar,
    sx - padPx + (contentWidth + padPx * 2) / 2,
    sy,
    state.fontSize,
  );
}

// Параметры для синхронизации рамки контейнера (sticky или shape).
export interface IContainerSyncOpts {
  bbox: { x: number; y: number; w: number; h: number };
  fallbackColor: string;
  currentColor: string | null;
  // Опциональный CSS-border вокруг overlay (shape: stroke).
  strokeColor?: string;
  strokeWidth?: number;
  // Пропустить sticky-card декорации (drop-shadow, border-radius, default text-overlay
  // box-shadow). Используется shape: рамка editor невидима, контур рисует ghost-worldDrawer.
  bareFrame?: boolean;
  // Inner rect (мировые координаты) для editable. Если не передан, берётся
  // bbox минус STICKY_PADDING. Shape передаёт inscribed-rect под shapeKind,
  // чтобы wrap-математика и позиция совпадали с canvas-рендером.
  innerRect?: { x: number; y: number; w: number; h: number };
}

// Синхронизирует рамку контейнерного редактора (sticky) с bbox в мировых координатах.
export function syncContainerFrame(
  refs: ITextSyncRefs,
  state: ITextSyncState,
  camera: Camera,
  opts: IContainerSyncOpts,
  html: string,
): void {
  const { frame, editable, toolbar } = refs;
  if (!frame || !editable) return;

  const { sx: topLeftSx, sy: topLeftSy } = camera.worldToScreen(
    opts.bbox.x,
    opts.bbox.y,
  );
  const zoom = camera.zoom;
  const screenWidth = opts.bbox.w * zoom;
  const screenHeight = opts.bbox.h * zoom;
  const zoomedFontSize = state.fontSize * zoom;
  const zoomedLineHeight = zoomedFontSize * TEXT_LINE_HEIGHT;
  const background = opts.currentColor ?? opts.fallbackColor;

  frame.style.left = `${topLeftSx}px`;
  frame.style.top = `${topLeftSy}px`;
  frame.style.width = `${screenWidth}px`;
  frame.style.height = `${screenHeight}px`;
  if (opts.bareFrame) {
    // Shape-режим: editor невидим, контур и заливку рисует ghost-worldDrawer.
    frame.style.borderRadius = "0";
    frame.style.boxShadow = "none";
  } else {
    frame.style.borderRadius = `${STICKY_CORNER_RADIUS}px`;
    frame.style.boxShadow = `0 ${Math.round(zoom * STICKY_SHADOW_Y_OFFSET)}px ${Math.round(zoom * STICKY_SHADOW_BLUR)}px rgba(0,0,0,${STICKY_SHADOW_ALPHA})`;
  }
  frame.style.background = background;
  if (opts.strokeColor !== undefined && opts.strokeWidth !== undefined) {
    const borderPx = Math.max(1, opts.strokeWidth * camera.zoom);
    frame.style.border = `${borderPx}px solid ${opts.strokeColor}`;
  } else {
    frame.style.border = "";
  }
  frame.style.overflow = "hidden";

  let innerLeft: number;
  let innerTop: number;
  let innerWidth: number;
  let innerHeight: number;
  if (opts.innerRect) {
    innerLeft = (opts.innerRect.x - opts.bbox.x) * zoom;
    innerTop = (opts.innerRect.y - opts.bbox.y) * zoom;
    innerWidth = Math.max(0, opts.innerRect.w * zoom);
    innerHeight = Math.max(0, opts.innerRect.h * zoom);
  } else {
    const pad = Math.round(zoom * STICKY_PADDING);
    innerLeft = pad;
    innerTop = pad;
    innerWidth = Math.max(0, screenWidth - 2 * pad);
    innerHeight = Math.max(0, screenHeight - 2 * pad);
  }

  // Та же wrap-math, что в canvas-рендере, чтобы не было прыжка на коммит.
  const measured = measureEditableLayout(
    html,
    zoomedFontSize,
    TEXT_FONT_FAMILY,
    innerWidth,
  );

  applyEditableTypography(editable, zoomedFontSize, zoomedLineHeight, state.textAlign);
  // Вертикальное центрирование editable внутри inner-rect: совпадает с canvas-рендером
  // (оба центрируют блок текста по высоте).
  const editableHeight = Math.min(
    innerHeight,
    Math.max(zoomedLineHeight, measured.height),
  );
  const verticalOffset = Math.max(0, (innerHeight - editableHeight) / 2);
  editable.style.position = "absolute";
  editable.style.left = `${innerLeft}px`;
  editable.style.top = `${innerTop + verticalOffset}px`;
  editable.style.width = `${innerWidth}px`;
  editable.style.height = `${editableHeight}px`;
  editable.style.maxHeight = `${innerHeight}px`;
  editable.style.color = pickTextColor(background);
  editable.style.whiteSpace = "pre-wrap";
  editable.style.wordWrap = "break-word";
  editable.style.overflow = "hidden";

  positionToolbar(
    toolbar,
    topLeftSx + screenWidth / 2,
    topLeftSy,
    state.fontSize,
  );
}

// Переводит клиентские координаты курсора в мировые с учётом контейнера и камеры.
// Принимает rect (а не сам контейнер) — caller использует кэш ContainerRect.get().
export function clientToWorld(
  rect: DOMRect,
  camera: Camera,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const { wx, wy } = camera.screenToWorld(
    clientX - rect.left,
    clientY - rect.top,
  );
  return { x: wx, y: wy };
}

// Возвращает текущие размеры редактируемого текста в мировых единицах.
export function getWorldDims(
  refs: Pick<ITextSyncRefs, "measurer" | "editable" | "measureDiv">,
  fontSize: number,
  camera: Camera,
): { w: number; h: number } {
  const { measurer, editable, measureDiv } = refs;
  if (!measurer || !editable) return { w: 0, h: 0 };

  const zoomedFontSize = fontSize * camera.zoom;
  const zoomedLineHeight = zoomedFontSize * TEXT_LINE_HEIGHT;
  let screenWidth: number;
  if (measureDiv) {
    measureDiv.style.fontSize = `${zoomedFontSize}px`;
    measureDiv.style.lineHeight = `${zoomedLineHeight}px`;
    measureDiv.innerHTML = editable.innerHTML;
    screenWidth = measureDiv.offsetWidth;
  } else {
    screenWidth = 0;
  }
  if (screenWidth <= EDITOR_MIN_CONTENT_WIDTH_PX) {
    measurer.textContent = TEXT_PLACEHOLDER;
    screenWidth = measurer.offsetWidth;
  }
  const lineCount = (getEditableText(editable) || TEXT_PLACEHOLDER).split(
    "\n",
  ).length;
  return {
    w: screenWidth / camera.zoom,
    h: lineCount * fontSize * TEXT_LINE_HEIGHT,
  };
}

// Подписывает callback на изменения камеры и возвращает функцию отписки.
export function subscribeCameraReposition(
  camera: Camera,
  reposition: () => void,
): () => void {
  return camera.subscribe(reposition);
}
