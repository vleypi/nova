import { createRef, createElement } from "react";
import { createRoot, Root } from "react-dom/client";
import { flushSync } from "react-dom";
import type { TextFormatToolbarHandle } from "@/features/board/components/Board/TextFormatToolbar";
import { TextFormatToolbar } from "@/features/board/components/Board/TextFormatToolbar";
import { EDITOR_TOOLBAR_FADE_MS } from "@/features/board/constants/board.constant";
import { getCurrentDiv, rgbToHex } from "@engine/editor/editor.text-utils";
import type { TShapeKind } from "@engine/types";

// Набор колбэков, которые UI-toolbar вызывает при действиях пользователя.
export interface IToolbarCallbacks {
  onFontSizeChange: (size: number) => void;
  onFormatCommand: (command: string) => void;
  onAlignChange: (align: "left" | "center" | "right") => void;
  onInsertLink: (url: string) => void;
  onLinkBarToggle: (open: boolean) => void;
  onColorChange: (color: string) => void;
  onColorBarToggle: (open: boolean) => void;
  onHighlightChange: (color: string) => void;
  onHighlightBarToggle: (open: boolean) => void;
  onListToggle: (type: "bullet" | "number") => void;
}

// Опции инициализации адаптера: контейнеры, начальное состояние и режим стикера.
export interface ITextEditorToolbarAdapterOptions {
  parent: HTMLElement;
  editable: HTMLDivElement;
  initialFontSize: number;
  initialAlign: "left" | "center" | "right";
  onFocusLost: () => void;
  stickyMode?: {
    palette: readonly string[];
    currentColor: string;
    onPaletteChange: (color: string) => void;
  };
  shapeMode?: {
    fillPalette: readonly string[];
    currentFillColor: string;
    onFillChange: (color: string) => void;
    strokePalette: readonly string[];
    currentStrokeColor: string;
    onStrokeChange: (color: string) => void;
    shapeKind: TShapeKind;
    shapeKinds: readonly TShapeKind[];
    onShapeKindChange: (kind: TShapeKind) => void;
  };
}

interface IRangeSlot {
  current: Range | null;
}

// Адаптер UI-toolbar над inline-редактором текста: монтирует React-toolbar и синхронизирует его состояние.
export class TextEditorToolbarAdapter {
  private readonly container: HTMLDivElement;
  private root: Root | null = null;
  private readonly toolbarRef = createRef<TextFormatToolbarHandle>();
  private readonly editable: HTMLDivElement;
  private boundSelectionChange: (() => void) | null = null;
  readonly linkRange: IRangeSlot = { current: null };
  readonly colorRange: IRangeSlot = { current: null };
  readonly highlightRange: IRangeSlot = { current: null };
  private destroyed = false;

  constructor(
    options: ITextEditorToolbarAdapterOptions,
    toolbarCallbacks: IToolbarCallbacks,
  ) {
    this.editable = options.editable;
    const container = document.createElement("div");
    options.parent.appendChild(container);
    this.container = container;

    container.addEventListener("focusout", (event: FocusEvent) => {
      const relatedTarget = event.relatedTarget as Element | null;
      requestAnimationFrame(() => {
        if (this.destroyed) return;
        if (
          relatedTarget &&
          (relatedTarget === this.editable ||
            this.container.contains(relatedTarget))
        ) {
          return;
        }
        options.onFocusLost();
      });
    });

    this.root = createRoot(container);
    // Без синхронного рендера ref тулбара пуст к моменту первого позиционирования.
    flushSync(() => {
      this.root!.render(
        createElement(TextFormatToolbar, {
          ref: this.toolbarRef,
          callbacks: toolbarCallbacks,
          initialFontSize: options.initialFontSize,
          initialAlign: options.initialAlign,
          stickyMode: options.stickyMode,
          shapeMode: options.shapeMode,
        }),
      );
    });

    this.boundSelectionChange = () => this.syncFormatStates();
    document.addEventListener("selectionchange", this.boundSelectionChange);
  }

  // Обновляет позицию toolbar и текущий размер шрифта в UI.
  syncPosition(cx: number, topY: number, fontSize: number): boolean {
    const handle = this.toolbarRef.current;
    if (!handle) return false;
    handle.syncPosition(cx, topY);
    handle.updateFontSize(fontSize);
    return true;
  }

  // Плавный fade через opacity; visibility снимается с задержкой fade-длительности,
  // чтобы клики блокировались строго после полного затухания.
  setVisible(visible: boolean): void {
    if (visible) {
      this.container.style.transition = `opacity ${EDITOR_TOOLBAR_FADE_MS}ms ease, visibility 0s linear 0s`;
      this.container.style.visibility = "visible";
      this.container.style.opacity = "1";
    } else {
      this.container.style.transition = `opacity ${EDITOR_TOOLBAR_FADE_MS}ms ease, visibility 0s linear ${EDITOR_TOOLBAR_FADE_MS}ms`;
      this.container.style.opacity = "0";
      this.container.style.visibility = "hidden";
    }
  }

  // Проверяет, принадлежит ли узел контейнеру toolbar.
  contains(node: Element | null): boolean {
    return !!node && this.container.contains(node);
  }

  // Сообщает toolbar текущее состояние списка под курсором.
  pushListState(type: "bullet" | "number" | null): void {
    this.toolbarRef.current?.updateListState(type);
  }

  // Передаёт в toolbar обновление состояния стикер-режима.
  pushStickyState(patch: { currentColor?: string }): void {
    this.toolbarRef.current?.updateStickyState(patch);
  }

  // Передаёт в toolbar обновление shape-состояния (currentFill, currentStroke, shapeKind).
  pushShapeState(patch: {
    currentFillColor?: string;
    currentStrokeColor?: string;
    shapeKind?: TShapeKind;
  }): void {
    this.toolbarRef.current?.updateShapeState(patch);
  }

  // Сохраняет текущий выделенный диапазон документа в указанный слот.
  captureRange(slot: IRangeSlot): void {
    const selection = window.getSelection();
    slot.current =
      selection && selection.rangeCount > 0
        ? selection.getRangeAt(0).cloneRange()
        : null;
  }

  // Возвращает и очищает сохранённый диапазон в слоте.
  consumeRange(slot: IRangeSlot): Range | null {
    const range = slot.current;
    slot.current = null;
    return range;
  }


  peekRange(slot: IRangeSlot): Range | null {
    return slot.current;
  }

  // Снимает обработчики и размонтирует React-корень toolbar.
  // unmount + container.remove() выполняются ВНУТРИ microtask единым шагом:
  // synchronous unmount внутри React-render запрещён ("nor synchronously unmount during render"),
  // а отложенный unmount после synchronous container.remove() оставляет React-дерево
  // в детачнутом DOM (warnings + потенциальные orphan handlers).
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.boundSelectionChange) {
      document.removeEventListener(
        "selectionchange",
        this.boundSelectionChange,
      );
      this.boundSelectionChange = null;
    }
    const root = this.root;
    const container = this.container;
    this.root = null;
    queueMicrotask(() => {
      root?.unmount();
      container.remove();
    });
  }

  private syncFormatStates(): void {
    if (document.activeElement !== this.editable) return;
    const handle = this.toolbarRef.current;
    if (!handle) return;

    handle.updateFormatStates({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
    });

    const currentDiv = getCurrentDiv(this.editable);
    const listType = (currentDiv?.dataset.liType ?? null) as
      | "bullet"
      | "number"
      | null;
    handle.updateListState(listType);

    const selection = window.getSelection();
    const hasSelection =
      selection &&
      selection.rangeCount > 0 &&
      !selection.getRangeAt(0).collapsed;
    if (!hasSelection) {
      handle.updateColorState(null);
      handle.updateHighlightState(null);
      return;
    }

    const rawColor = document.queryCommandValue("foreColor");
    const hex = rawColor ? rgbToHex(rawColor) : null;
    handle.updateColorState(hex);


    const rawBg = document.queryCommandValue("backColor");
    const bgHex = rgbToHex(rawBg);
    const isTransparent =
      !rawBg ||
      rawBg === "transparent" ||
      /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/.test(rawBg);
    handle.updateHighlightState(isTransparent ? "transparent" : bgHex);
  }
}
