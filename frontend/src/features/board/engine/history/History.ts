import { THistoryEntry } from "@engine/types";
import { MAX_HISTORY_SIZE } from "@/features/board/constants/board.constant";

// LIFO-стек действий с поддержкой undo/redo. Index указывает на последнее применённое действие.
export class History {
  private stack: THistoryEntry[] = [];
  private index = -1;

  onUndo?: (entry: THistoryEntry) => void;
  onRedo?: (entry: THistoryEntry) => void;

  // Добавляет новое действие. Отбрасывает ветку redo, если она была.
  // Если превышен лимит, удаляет самые старые записи.
  push(entry: THistoryEntry): void {
    this.stack = this.stack.slice(0, this.index + 1);
    this.stack.push(entry);
    if (this.stack.length > MAX_HISTORY_SIZE) {
      this.stack.splice(0, this.stack.length - MAX_HISTORY_SIZE);
    }
    this.index = this.stack.length - 1;
  }

  // Откатывает последнее действие, вызывает onUndo с откатываемой записью.
  undo(): void {
    if (this.index < 0) return;
    const entry = this.stack[this.index--];
    this.onUndo?.(entry);
  }

  // Повторяет следующее действие из ветки redo, вызывает onRedo.
  redo(): void {
    if (this.index >= this.stack.length - 1) return;
    const entry = this.stack[++this.index];
    this.onRedo?.(entry);
  }

  // Есть ли что откатывать.
  canUndo(): boolean {
    return this.index >= 0;
  }

  // Есть ли что повторять.
  canRedo(): boolean {
    return this.index < this.stack.length - 1;
  }
}
