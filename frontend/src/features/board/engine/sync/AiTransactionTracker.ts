import type { IElement } from "@engine/types";
import type {
  IAiChunkElement,
  IAiDone,
} from "@/features/board/services/ai.service";

export interface IAiTransactionState {
  txId: string;
  createdElementIds: string[];
  createdElements: IElement[];
  hadEditOps: boolean;
  totalSteps: {
    created: number;
    updated: number;
    moved: number;
    deleted: number;
  };
  firstElementCenter?: { x: number; y: number };
}

export interface IAiElementChunkResult {
  isFirstInTx: boolean;
  firstCenter?: { x: number; y: number };
  snapshot: IAiTransactionState;
}

/**
 * Трекает активные AI-транзакции инициатора. Один экземпляр на BoardSync.
 *
 * - `onElementChunk` вызывается на каждый `ai:chunk:element`. Обновляет
 *   счётчики, фиксирует центр первого создаваемого элемента, помечает
 *   `hadEditOps=true` если в транзакции были update/move/delete (это
 *   блокирует создание ai-create undo entry).
 * - `onDone` вызывается на `ai:done`, возвращает финальный snapshot
 *   и удаляет транзакцию из активных.
 */
export class AiTransactionTracker {
  private readonly active = new Map<string, IAiTransactionState>();

  onElementChunk(event: IAiChunkElement): IAiElementChunkResult {
    let tx = this.active.get(event.txId);
    if (!tx) {
      tx = {
        txId: event.txId,
        createdElementIds: [],
        createdElements: [],
        hadEditOps: false,
        totalSteps: { created: 0, updated: 0, moved: 0, deleted: 0 },
      };
      this.active.set(event.txId, tx);
    }

    let isFirstInTx = false;
    if (event.op === "create" && event.element) {
      const wasEmpty = tx.createdElementIds.length === 0;
      tx.createdElementIds.push(event.element.id);
      tx.createdElements.push(event.element);
      tx.totalSteps.created++;
      if (wasEmpty) {
        tx.firstElementCenter = bboxCenter(event.element);
        isFirstInTx = true;
      }
    }
    if (event.op === "update") {
      tx.hadEditOps = true;
      tx.totalSteps.updated++;
    } else if (event.op === "move") {
      tx.hadEditOps = true;
      tx.totalSteps.moved++;
    } else if (event.op === "delete") {
      tx.hadEditOps = true;
      tx.totalSteps.deleted++;
    }

    return {
      isFirstInTx,
      firstCenter: tx.firstElementCenter,
      snapshot: tx,
    };
  }

  onDone(event: IAiDone): IAiTransactionState | null {
    const tx = this.active.get(event.txId) ?? null;
    this.active.delete(event.txId);
    return tx;
  }
}

/**
 * Считает центр bbox элемента. Если bbox отсутствует — пытается вычислить
 * по полям x/y/width/height. Если и тех нет — возвращает (0,0).
 */
export function bboxCenter(el: IElement): { x: number; y: number } {
  const bbox = el.bbox;
  if (bbox) {
    return { x: (bbox.minX + bbox.maxX) / 2, y: (bbox.minY + bbox.maxY) / 2 };
  }
  const r = el as unknown as Record<string, unknown>;
  const x =
    (typeof r.x === "number" ? r.x : 0) +
    (typeof r.width === "number" ? r.width / 2 : 0);
  const y =
    (typeof r.y === "number" ? r.y : 0) +
    (typeof r.height === "number" ? r.height / 2 : 0);
  return { x, y };
}
