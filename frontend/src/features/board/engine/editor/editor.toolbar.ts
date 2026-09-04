import { TextEditorCommands } from "./TextEditorCommands";
import {
  IToolbarCallbacks,
  TextEditorToolbarAdapter,
} from "./TextEditorToolbarAdapter";

// Зависимости для построения колбэков тулбара inline-редактора.
export interface IBuildToolbarCallbacksDeps {
  getEditable: () => HTMLDivElement | null;
  getCommands: () => TextEditorCommands | null;
  getToolbar: () => TextEditorToolbarAdapter | null;
  setFontSize: (size: number) => void;
  setTextAlign: (align: "left" | "center" | "right") => void;
  setSuppressBlur: (suppress: boolean) => void;
  requestSync: () => void;
}

// Возвращает фокус в редактируемую область после закрытия поповера.
function refocusEditable(deps: IBuildToolbarCallbacksDeps): void {
  requestAnimationFrame(() =>
    deps.getEditable()?.focus({ preventScroll: true }),
  );
}

// Применяет окрашивание (цвет текста или подсветка) к сохранённому диапазону.
function applyRangedColor(
  deps: IBuildToolbarCallbacksDeps,
  rangeKey: "colorRange" | "highlightRange",
  apply: (commands: TextEditorCommands, color: string, saved: Range | null) => void,
  color: string,
): void {
  const commands = deps.getCommands();
  const toolbar = deps.getToolbar();
  if (!commands || !toolbar) return;
  const saved = toolbar.peekRange(toolbar[rangeKey]);
  deps.setSuppressBlur(false);
  apply(commands, color, saved);
}

// Обрабатывает открытие/закрытие поповера: захват диапазона или возврат фокуса.
// На закрытии очищаем range, чтобы не утащить устаревший в следующее открытие.
function handleBarToggle(
  deps: IBuildToolbarCallbacksDeps,
  rangeKey: "colorRange" | "highlightRange",
  open: boolean,
): void {
  const toolbar = deps.getToolbar();
  if (!toolbar) return;
  if (open) {
    toolbar.captureRange(toolbar[rangeKey]);
  } else {
    toolbar.consumeRange(toolbar[rangeKey]);
    refocusEditable(deps);
  }
}

// Строит набор колбэков тулбара поверх команд редактора и адаптера.
export function buildToolbarCallbacks(
  deps: IBuildToolbarCallbacksDeps,
): IToolbarCallbacks {
  return {
    onFontSizeChange: (size) => {
      deps.setFontSize(size);
      deps.requestSync();
    },

    onFormatCommand: (command) => {
      const editable = deps.getEditable();
      if (!editable) return;
      editable.focus();
      document.execCommand(command);
      deps.requestSync();
    },

    onAlignChange: (align) => {
      deps.setTextAlign(align);
      deps.requestSync();
    },

    onInsertLink: (url) => {
      const commands = deps.getCommands();
      const toolbar = deps.getToolbar();
      if (!commands || !toolbar) return;
      const saved = toolbar.consumeRange(toolbar.linkRange);
      commands.insertLink(url, saved);
    },

    onLinkBarToggle: (open) => {
      const toolbar = deps.getToolbar();
      if (!toolbar) return;
      if (open) {
        toolbar.captureRange(toolbar.linkRange);
        deps.setSuppressBlur(true);
      } else {
        deps.setSuppressBlur(false);
        refocusEditable(deps);
      }
    },

    onColorChange: (color) =>
      applyRangedColor(
        deps,
        "colorRange",
        (commands, value, saved) => commands.applyColor(value, saved),
        color,
      ),

    onColorBarToggle: (open) => handleBarToggle(deps, "colorRange", open),

    onHighlightChange: (color) =>
      applyRangedColor(
        deps,
        "highlightRange",
        (commands, value, saved) => commands.applyHighlight(value, saved),
        color,
      ),

    onHighlightBarToggle: (open) => handleBarToggle(deps, "highlightRange", open),

    onListToggle: (type) => deps.getCommands()?.toggleList(type),
  };
}
