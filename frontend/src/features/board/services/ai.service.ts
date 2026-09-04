import boardWsService, { type SocketListener } from "./board-ws.service";
import type { IElement } from "@engine/types";

// =====================================================================
// Mirror of nova-backend/apps/collaboration-service/src/ai/ai.service.ts
// AiChunkEvent — keep in sync manually with backend.
// =====================================================================

const WS_EVENT_AI = {
  MESSAGE: "ai:message",
  CHUNK_TEXT: "ai:chunk:text",
  CHUNK_ELEMENT: "ai:chunk:element",
  CHUNK_TOOL_FAILED: "ai:chunk:tool_failed",
  DONE: "ai:done",
  ERROR: "ai:error",
} as const;

export type AiErrorCode = "validation" | "upstream" | "timeout" | "unknown";

export interface IAiHistoryEntry {
  role: "user" | "assistant";
  content: string;
}

export interface IAiContextSlot {
  slotId: string;
  label?: string;
  elementIds: string[];
  // Снапшот элементов — фолбэк на бэке, если элемент ещё не персистнут в Redis.
  elements?: Array<Record<string, unknown>>;
}

export interface IAiChunkText {
  txId: string;
  delta: string;
}

export interface IAiChunkElement {
  txId: string;
  step: number;
  op: "create" | "update" | "move" | "delete";
  element?: IElement;
  elementId?: string;
  patch?: Record<string, unknown>;
  failure?: string;
}

export interface IAiChunkToolFailed {
  txId: string;
  step: number;
  toolName: string;
  error: string;
}

export interface IAiDoneSummary {
  created: number;
  updated: number;
  moved: number;
  deleted: number;
}

export interface IAiDone {
  txId: string;
  ok: boolean;
  finalMessage: string;
  summary: IAiDoneSummary;
  error?: { code: AiErrorCode; message: string };
}

export interface IAiErrorData {
  code?: string;
  message?: string;
  /** legacy single-field error from gateway */
  error?: string;
}

/**
 * Сервис AI-чата. Использует тот же socket, что и BoardWsService
 * (через generic on/emit). Singleton.
 *
 * Старый `onResponse(...)` удалён — бэк больше не шлёт `ai:response`,
 * используется потоковый протокол: text → element*N → done.
 */
class AiService {
  emitMessage(
    boardId: string,
    message: string,
    history: IAiHistoryEntry[],
    viewportHint?: { x: number; y: number; zoom: number; cx?: number; cy?: number; vw?: number; vh?: number },
    contextSlots?: IAiContextSlot[],
  ): void {
    boardWsService.emit(WS_EVENT_AI.MESSAGE, {
      boardId,
      message,
      history,
      viewportHint,
      contextSlots,
    });
  }

  onChunkText(cb: (data: IAiChunkText) => void): () => void {
    return boardWsService.on(WS_EVENT_AI.CHUNK_TEXT, cb as SocketListener);
  }

  onChunkElement(cb: (data: IAiChunkElement) => void): () => void {
    return boardWsService.on(WS_EVENT_AI.CHUNK_ELEMENT, cb as SocketListener);
  }

  onChunkToolFailed(cb: (data: IAiChunkToolFailed) => void): () => void {
    return boardWsService.on(
      WS_EVENT_AI.CHUNK_TOOL_FAILED,
      cb as SocketListener,
    );
  }

  onDone(cb: (data: IAiDone) => void): () => void {
    return boardWsService.on(WS_EVENT_AI.DONE, cb as SocketListener);
  }

  onError(cb: (data: IAiErrorData) => void): () => void {
    return boardWsService.on(WS_EVENT_AI.ERROR, cb as SocketListener);
  }
}

export const aiService = new AiService();
export default aiService;
