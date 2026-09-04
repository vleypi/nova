import { isEditingText } from "@engine/utils/dom-focus";

// Глобальные хоткеи доски:
//  - Ctrl/Cmd+Z (undo), Ctrl/Cmd+Y / Ctrl/Cmd+Shift+Z (redo)
//  - Delete/Backspace (удаление выделенных элементов)
// Внутри contenteditable/INPUT/TEXTAREA ничего не перехватываем, чтобы не ломать
// браузерный undo/redo контента и удаление символов клавишей Backspace в тексте.
export class KeyboardHandler {
  private undo: () => void;
  private redo: () => void;
  private deleteSelected: () => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(actions: {
    undo: () => void;
    redo: () => void;
    deleteSelected: () => void;
  }) {
    this.undo = actions.undo;
    this.redo = actions.redo;
    this.deleteSelected = actions.deleteSelected;
    this.boundKeyDown = this.onKeyDown.bind(this);
  }

  attach(): void {
    window.addEventListener("keydown", this.boundKeyDown);
  }

  detach(): void {
    window.removeEventListener("keydown", this.boundKeyDown);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (isEditingText()) return;

    if (e.code === "Delete" || e.code === "Backspace") {
      e.preventDefault();
      this.deleteSelected();
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.code !== "KeyZ" && e.code !== "KeyY") return;

    e.preventDefault();
    if (e.code === "KeyY" || e.shiftKey) {
      this.redo();
    } else {
      this.undo();
    }
  }
}
