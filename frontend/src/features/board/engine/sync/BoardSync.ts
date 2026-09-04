import {
  IElement,
  THistoryEntry,
  IWsOnlineUser,
  IWsCursorUpdated,
} from "@engine/types";
import { TConnectionStatus } from "@engine/types/ui.types";
import { ElementStore } from "@engine/core/ElementStore";
import { SelectionManager } from "@engine/selection/SelectionManager";
import { BoardRenderer } from "@engine/renderer/BoardRenderer";
import { History } from "@engine/history/History";
import { HistoryApplicator } from "@engine/history/HistoryApplicator";
import { getHandler } from "@engine/elements/element-registry";
import { refreshConnectorBboxes } from "@engine/utils/connector-refresh";
import { BoardSocket } from "@engine/sync/BoardSocket";
import { BoardEngine } from "@engine/BoardEngine";
import {
  isValidElement,
  isValidPatch,
  isValidElementIds,
} from "@engine/sync/ws-validators";
import { AiTransactionTracker } from "./AiTransactionTracker";
import aiService, {
  type IAiChunkElement,
  type IAiDone,
} from "@/features/board/services/ai.service";

export interface IBoardSyncCallbacks {
  onUsersChange?: (users: IWsOnlineUser[]) => void;
  onUserLeft?: (userId: string) => void;
  onCursorUpdated?: (data: IWsCursorUpdated) => void;
  onCursorRemoved?: (userId: string) => void;
  onConnectionStatus?: (status: TConnectionStatus) => void;
  onBoardError?: (message: string) => void;
  onBoardReady?: () => void;
  onRemoteElementsDeleted?: (ids: Set<string>) => void;
}

// Центральный класс синхронизации доски с сервером.
// Принимает события из BoardSocket (с валидацией), обновляет store и рендер.
// Локальные действия пушит в History и эмитит в socket через emitEntry.
export class BoardSync {
  private store: ElementStore;
  private selection: SelectionManager;
  private renderer: BoardRenderer;
  private history: History;
  private applicator: HistoryApplicator;
  private boardId: string;
  private callbacks: IBoardSyncCallbacks;
  private socket: BoardSocket;
  private readonly engine: BoardEngine;
  private readonly aiTracker = new AiTransactionTracker();
  private readonly aiUnsubs: Array<() => void> = [];

  constructor(deps: {
    store: ElementStore;
    selection: SelectionManager;
    renderer: BoardRenderer;
    boardId: string;
    callbacks: IBoardSyncCallbacks;
    engine: BoardEngine;
  }) {
    this.store = deps.store;
    this.selection = deps.selection;
    this.renderer = deps.renderer;
    this.boardId = deps.boardId;
    this.callbacks = deps.callbacks;
    this.engine = deps.engine;

    this.applicator = new HistoryApplicator(
      this.store,
      this.selection,
      this.renderer,
    );
    this.history = new History();
    this.history.onUndo = (entry) => {
      this.applicator.applyUndo(entry);
      this.emitUndoEntry(entry);
    };
    this.history.onRedo = (entry) => {
      this.applicator.applyRedo(entry);
      this.emitEntry(entry);
    };

    this.socket = new BoardSocket(deps.boardId, {
      onBoardState: this.handleBoardState.bind(this),
      onUserJoined: this.handleUserJoined.bind(this),
      onUserLeft: this.handleUserLeft.bind(this),
      onCursorUpdated: (data) => this.callbacks.onCursorUpdated?.(data),
      onCursorRemoved: (userId) => this.callbacks.onCursorRemoved?.(userId),
      onConnectionStatus: (status) =>
        this.callbacks.onConnectionStatus?.(status),
      onBoardError: (message) => this.callbacks.onBoardError?.(message),
      onElementCreated: this.handleElementCreated.bind(this),
      onElementUpdated: this.handleElementUpdated.bind(this),
      onElementDeleted: this.handleElementDeleted.bind(this),
      // Live-drawing других пользователей пока не отображается.
      onElementDrawing: () => {},
    });

    this.subscribeAi();
  }

  connect(): void {
    this.socket.connect();
  }

  disconnect(): void {
    for (const u of this.aiUnsubs) u();
    this.aiUnsubs.length = 0;
    this.socket.disconnect();
  }

  undo(): void {
    this.history.undo();
  }

  redo(): void {
    this.history.redo();
  }

  emitCursorMove(x: number, y: number): void {
    this.socket.emitCursorMove(x, y);
  }

  // Пушит локальное действие в историю и в сокет.
  // Применение к store должно быть сделано до вызова (тулом, который создал entry).
  pushHistory(entry: THistoryEntry): void {
    this.history.push(entry);
    this.emitEntry(entry);
  }

  // Преобразует history-entry в соответствующее WS-сообщение.
  private emitEntry(entry: THistoryEntry): void {
    switch (entry.type) {
      case "draw":
        this.socket.emitElementCreate({
          ...entry.element,
          boardId: this.boardId,
        });
        break;
      case "erase":
        this.socket.emitElementDelete(entry.elements.map((el) => el.id));
        break;
      case "paste":
        for (const el of entry.elements) {
          this.socket.emitElementCreate({ ...el, boardId: this.boardId });
        }
        break;
      case "move":
      case "resize":
      case "edit":
        for (const change of entry.changes) {
          this.socket.emitElementUpdate(
            change.id,
            change.newData as Record<string, unknown>,
          );
        }
        break;
      case "ai-create":
        for (const el of entry.elements) {
          this.socket.emitElementCreate({ ...el, boardId: this.boardId });
        }
        break;
    }
  }

  // Эмитит обратное к entry действие. Локальный store уже обновлён applicator,
  // echo от сервера дедуплицируется в handleElement* (по id для create, no-op для повторного delete/update).
  private emitUndoEntry(entry: THistoryEntry): void {
    switch (entry.type) {
      case "draw":
        this.socket.emitElementDelete([entry.element.id]);
        break;
      case "erase":
        for (const el of entry.elements) {
          this.socket.emitElementCreate({ ...el, boardId: this.boardId });
        }
        break;
      case "paste":
        this.socket.emitElementDelete(entry.elements.map((el) => el.id));
        break;
      case "move":
      case "resize":
      case "edit":
        for (const change of entry.changes) {
          this.socket.emitElementUpdate(
            change.id,
            change.oldData as Record<string, unknown>,
          );
        }
        break;
      case "ai-create":
        this.socket.emitElementDelete(entry.elements.map((el) => el.id));
        break;
    }
  }

  // Полное состояние доски от сервера. Невалидные элементы отбрасываются с warn.
  // Try/catch защищает от падения при странных данных, чтобы не оборвать соединение.
  private handleBoardState(
    elements: IElement[],
    users: IWsOnlineUser[],
  ): void {
    try {
      const valid = elements.filter((el) => {
        if (isValidElement(el)) return true;
        console.warn(
          "[BoardSync] dropped invalid element from board:state",
          el,
        );
        return false;
      });
      this.store.setAll(valid);
      for (const el of valid) this.ensureBbox(el);
      this.rerender();
    } catch (e) {
      console.error("[BoardSync] handleBoardState render error:", e);
    }
    this.callbacks.onUsersChange?.(users);
    this.callbacks.onBoardReady?.();
  }

  private handleUserJoined(user: IWsOnlineUser): void {
    this.callbacks.onUsersChange?.([user]);
  }

  private handleUserLeft(userId: string): void {
    this.callbacks.onCursorRemoved?.(userId);
    this.callbacks.onUserLeft?.(userId);
  }

  // Новый элемент от другого клиента. Дедуп по id, валидация, добавление и render.
  private handleElementCreated(element: IElement): void {
    if (!isValidElement(element)) {
      console.warn(
        "[BoardSync] dropped invalid element:created payload",
        element,
      );
      return;
    }
    if (this.store.has(element.id)) return;
    this.store.add(element);
    this.ensureBbox(element);
    this.renderer.addElementToBuffer(element);
    this.renderer.renderFrame();
  }

  // Patch к существующему элементу. Невалидные id или patch отбрасываются.
  private handleElementUpdated(
    elementId: string,
    patch: Record<string, unknown>,
  ): void {
    if (typeof elementId !== "string" || !elementId) {
      console.warn(
        "[BoardSync] invalid elementId in element:updated",
        elementId,
      );
      return;
    }
    if (!isValidPatch(patch)) {
      console.warn("[BoardSync] invalid patch in element:updated", patch);
      return;
    }
    this.store.update(elementId, patch);
    refreshConnectorBboxes(this.store, new Set([elementId]));
    this.rerender();
  }

  // Удаление элементов от другого клиента. Чистим выделение и зовём onRemoteElementsDeleted
  // чтобы EditingController закрыл оверлей если редактируемый элемент удалён.
  private handleElementDeleted(elementIds: string[]): void {
    if (!isValidElementIds(elementIds)) {
      console.warn(
        "[BoardSync] invalid elementIds in element:deleted",
        elementIds,
      );
      return;
    }
    const ids = new Set(elementIds);
    this.store.removeMany(ids);
    this.selection.unselectMany(ids);
    refreshConnectorBboxes(this.store, ids);
    this.callbacks.onRemoteElementsDeleted?.(ids);
    this.rerender();
  }

  private subscribeAi(): void {
    this.aiUnsubs.push(
      aiService.onChunkElement((evt) => this.handleAiChunkElement(evt)),
    );
    this.aiUnsubs.push(aiService.onDone((evt) => this.handleAiDone(evt)));
    this.aiUnsubs.push(
      aiService.onChunkToolFailed((evt) => {
        // tool_failed — debug-only сигнал (битый JSON в tool_call args от модели).
        // Юзеру не показываем, модель сама пересоберёт в следующей итерации.
        console.warn("[ai] tool failed", evt);
      }),
    );
  }

  private handleAiChunkElement(event: IAiChunkElement): void {
    const result = this.aiTracker.onElementChunk(event);

    // На каждый create регистрируем fade-in для свежего элемента.
    if (event.op === "create" && event.element) {
      this.renderer.registerAiFade(event.element.id);
    }

    // На первом create транзакции центрируем камеру.
    if (result.isFirstInTx && result.firstCenter) {
      this.engine.camera.centerOn(result.firstCenter.x, result.firstCenter.y);
    }

    // Эмитим прогресс в виджет через EventBus.
    this.engine.emit("aiElementProgress", {
      txId: event.txId,
      created: result.snapshot.totalSteps.created,
      updated: result.snapshot.totalSteps.updated,
      moved: result.snapshot.totalSteps.moved,
      deleted: result.snapshot.totalSteps.deleted,
      step: event.step,
    });
  }

  private handleAiDone(event: IAiDone): void {
    const tx = this.aiTracker.onDone(event);

    this.engine.emit("aiTransactionDone", {
      txId: event.txId,
      ok: event.ok,
      summary: event.summary,
      error: event.error,
    });

    if (!tx) return;
    if (!event.ok) return;
    if (tx.hadEditOps) return;
    if (tx.createdElementIds.length === 0) return;

    // Снимок (структурный клон) элементов из store. structuredClone требует Node 17+ /
    // Chrome 98+ / Safari 15.4+ — в Next.js 16 это baseline.
    const elements = tx.createdElementIds
      .map((id) => this.store.getById(id))
      .filter((e): e is IElement => !!e)
      .map((e) => structuredClone(e));

    if (elements.length === 0) return;

    this.history.push({ type: "ai-create", txId: tx.txId, elements });
  }

  // Считает bbox если элемент пришёл без него. Молча игнорирует незнакомые типы.
  private ensureBbox(el: IElement): void {
    if (el.bbox) return;
    try {
      getHandler(el.type).computeBbox(el, this.store);
      this.store.reindex(el.id);
    } catch {}
  }

  private rerender(): void {
    this.renderer.rebuildBuffer();
    this.renderer.renderFrame();
  }
}
