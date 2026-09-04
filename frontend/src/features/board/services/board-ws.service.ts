import { io, Socket } from "socket.io-client";
import {
  IElement,
  IPoint,
  IWsBoardState,
  IWsUserJoined,
  IWsUserLeft,
  IWsCursorUpdated,
  IWsCursorRemoved,
  IWsElementDrawing,
  IWsElementCreated,
  IWsElementUpdated,
  IWsElementDeleted,
  IWsBoardError,
} from "../engine/types";

// Резолв URL для WebSocket по приоритету:
//   1. NEXT_PUBLIC_COLLAB_URL — явный override (например, в раздельном dev).
//   2. NEXT_PUBLIC_API_URL    — единая точка входа (nginx /socket.io/ → collab).
//   3. http://localhost:5003  — fallback для raw-dev без nginx (npm run dev).
// В docker-compose nginx проксирует /socket.io/, и достаточно задать NEXT_PUBLIC_API_URL.
const COLLAB_URL =
  process.env.NEXT_PUBLIC_COLLAB_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5003";

// Имена WebSocket-событий между клиентом и collab-сервером.
// Сгруппированы по доменам: board (мета), cursor, element (рисование/правки).
const WS_EVENT = {
  BOARD_JOIN: "board:join",
  BOARD_LEAVE: "board:leave",
  BOARD_STATE: "board:state",
  BOARD_USER_JOINED: "board:user_joined",
  BOARD_USER_LEFT: "board:user_left",
  BOARD_ERROR: "board:error",
  CURSOR_MOVE: "cursor:move",
  CURSOR_UPDATED: "cursor:updated",
  CURSOR_REMOVED: "cursor:removed",
  ELEMENT_DRAWING: "element:drawing",
  ELEMENT_CREATE: "element:create",
  ELEMENT_UPDATE: "element:update",
  ELEMENT_DELETE: "element:delete",
  ELEMENT_CREATED: "element:created",
  ELEMENT_UPDATED: "element:updated",
  ELEMENT_DELETED: "element:deleted",
} as const;

export type SocketListener = (...args: unknown[]) => void;
export type ManagerListener = (...args: unknown[]) => void;
export type JoinAck = { ok: boolean; error?: string; users?: number };

// Хелпер для регистрации/снятия слушателей на Manager (socket.io). Динамические
// event-name'ы строго типизированы в socket.io-client, поэтому используем
// узкий unsafe-cast, локализованный в одной функции.
function bindManagerEvent(
  socket: Socket | null,
  event: string,
  cb: ManagerListener,
  action: "on" | "off",
): void {
  if (!socket) return;
  const manager = socket.io as unknown as {
    on: (e: string, c: ManagerListener) => void;
    off: (e: string, c: ManagerListener) => void;
  };
  manager[action](event, cb);
}

// Singleton-обёртка над socket.io-client. Один socket на всё приложение,
// reference-counted (несколько BoardSocket на одной странице делят один сокет).
//
// Ключевые свойства:
// 1. Подписки хранятся в Map отдельно от сокета. Если сокет был уничтожен и
//    пересоздан (refCount 1→0→1), все активные listener'ы автоматически
//    переподписываются на новый сокет. Без этого после полного disconnect
//    события `board:state`, `board:user_joined` и др. не приходят в UI.
// 2. `disconnect` отложен (debounce 500мс). Это защищает от React Strict Mode
//    (mount → cleanup → mount) и быстрых ремонтов — сокет не пересоздаётся,
//    если в течение 500мс приходит новый `connect`.
class BoardWsService {
  private socket: Socket | null = null;
  private refCount = 0;
  private socketListeners = new Map<string, Set<SocketListener>>();
  private managerListeners = new Map<string, Set<ManagerListener>>();
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly DISCONNECT_DEBOUNCE_MS = 500;
  private static readonly ACK_TIMEOUT_MS = 5_000;

  // Открывает соединение или возвращает существующее. Увеличивает refCount.
  // При пересоздании сокета переподписывает все активные listener'ы на новый сокет.
  connect(): Socket {
    this.refCount++;
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    if (this.socket) return this.socket;

    this.socket = io(COLLAB_URL, {
      withCredentials: true,
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      path: "/socket.io/",
    });

    // Переподписываем активные listener'ы.
    for (const [event, cbs] of this.socketListeners) {
      for (const cb of cbs) this.socket.on(event, cb);
    }
    for (const [event, cbs] of this.managerListeners) {
      for (const cb of cbs) bindManagerEvent(this.socket, event, cb, "on");
    }

    return this.socket;
  }

  // Уменьшает refCount, закрывает соединение через debounce когда последний
  // потребитель отключился. Debounce защищает от ложных reconnect-циклов.
  disconnect(): void {
    if (this.refCount > 0) this.refCount--;
    if (this.refCount > 0) return;
    if (this.disconnectTimer) return;
    this.disconnectTimer = setTimeout(() => {
      this.socket?.disconnect();
      this.socket = null;
      this.disconnectTimer = null;
    }, BoardWsService.DISCONNECT_DEBOUNCE_MS);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ===== Board: join/leave =====

  // joinBoard с ack — клиент ждёт подтверждения от сервера в течение
  // ACK_TIMEOUT_MS. Возвращает Promise с результатом: { ok: true, users } или
  // { ok: false, error }. Это позволяет UI понять, действительно ли join прошёл,
  // а не просто отправил emit в пустоту.
  joinBoard(
    boardId: string,
    ackTimeoutMs = BoardWsService.ACK_TIMEOUT_MS,
  ): Promise<JoinAck> {
    if (!this.socket) {
      return Promise.resolve({ ok: false, error: "not_connected" });
    }
    return new Promise((resolve) => {
      const timer = setTimeout(
        () => resolve({ ok: false, error: "timeout" }),
        ackTimeoutMs,
      );
      this.socket!.emit(
        WS_EVENT.BOARD_JOIN,
        { boardId },
        (ack: JoinAck | undefined) => {
          clearTimeout(timer);
          resolve(ack ?? { ok: false, error: "no_ack" });
        },
      );
    });
  }

  leaveBoard(boardId: string): void {
    this.socket?.emit(WS_EVENT.BOARD_LEAVE, { boardId });
  }

  // ===== Cursor: emit =====

  emitCursorMove(boardId: string, x: number, y: number): void {
    this.socket?.emit(WS_EVENT.CURSOR_MOVE, { boardId, x, y });
  }

  // ===== Element: emit =====

  emitElementDrawing(
    boardId: string,
    elementId: string,
    points: IPoint[],
    color: string,
    width: number,
  ): void {
    this.socket?.emit(WS_EVENT.ELEMENT_DRAWING, {
      boardId,
      elementId,
      points,
      color,
      width,
    });
  }

  emitElementCreate(boardId: string, element: IElement): void {
    this.socket?.emit(WS_EVENT.ELEMENT_CREATE, { boardId, element });
  }

  emitElementUpdate(
    boardId: string,
    elementId: string,
    patch: Record<string, unknown>,
  ): void {
    this.socket?.emit(WS_EVENT.ELEMENT_UPDATE, { boardId, elementId, patch });
  }

  emitElementDelete(boardId: string, elementIds: string[]): void {
    this.socket?.emit(WS_EVENT.ELEMENT_DELETE, { boardId, elementIds });
  }

  // ===== Connection lifecycle =====

  onConnect(cb: () => void): () => void {
    return this.addSocketListener("connect", cb as SocketListener);
  }

  onDisconnect(cb: (reason: string) => void): () => void {
    return this.addSocketListener("disconnect", cb as SocketListener);
  }

  // Manager-события: переподписываются на новый Manager при пересоздании сокета.
  onReconnectAttempt(cb: () => void): () => void {
    return this.addManagerListener("reconnect_attempt", cb as ManagerListener);
  }

  onReconnectFailed(cb: () => void): () => void {
    return this.addManagerListener("reconnect_failed", cb as ManagerListener);
  }

  // Срабатывает после успешного автоматического reconnect'а socket.io (без
  // полного пересоздания сокета через connect/disconnect).
  onReconnect(cb: () => void): () => void {
    return this.addManagerListener("reconnect", cb as ManagerListener);
  }

  // ===== Board: subscribe =====

  onBoardState(cb: (data: IWsBoardState) => void): () => void {
    return this.addSocketListener(WS_EVENT.BOARD_STATE, cb as SocketListener);
  }

  onUserJoined(cb: (data: IWsUserJoined) => void): () => void {
    return this.addSocketListener(WS_EVENT.BOARD_USER_JOINED, cb as SocketListener);
  }

  onUserLeft(cb: (data: IWsUserLeft) => void): () => void {
    return this.addSocketListener(WS_EVENT.BOARD_USER_LEFT, cb as SocketListener);
  }

  onBoardError(cb: (data: IWsBoardError) => void): () => void {
    return this.addSocketListener(WS_EVENT.BOARD_ERROR, cb as SocketListener);
  }

  // ===== Cursor: subscribe =====

  onCursorUpdated(cb: (data: IWsCursorUpdated) => void): () => void {
    return this.addSocketListener(WS_EVENT.CURSOR_UPDATED, cb as SocketListener);
  }

  onCursorRemoved(cb: (data: IWsCursorRemoved) => void): () => void {
    return this.addSocketListener(WS_EVENT.CURSOR_REMOVED, cb as SocketListener);
  }

  // ===== Element: subscribe =====

  onElementDrawing(cb: (data: IWsElementDrawing) => void): () => void {
    return this.addSocketListener(WS_EVENT.ELEMENT_DRAWING, cb as SocketListener);
  }

  onElementCreated(cb: (data: IWsElementCreated) => void): () => void {
    return this.addSocketListener(WS_EVENT.ELEMENT_CREATED, cb as SocketListener);
  }

  onElementUpdated(cb: (data: IWsElementUpdated) => void): () => void {
    return this.addSocketListener(WS_EVENT.ELEMENT_UPDATED, cb as SocketListener);
  }

  onElementDeleted(cb: (data: IWsElementDeleted) => void): () => void {
    return this.addSocketListener(WS_EVENT.ELEMENT_DELETED, cb as SocketListener);
  }

  // ===== Generic event API для соседних сервисов (например ai.service) =====

  // Подписка на произвольное socket-событие. Если socket ещё не подключён,
  // listener зарегистрируется при следующем connect автоматически.
  on(event: string, cb: SocketListener): () => void {
    return this.addSocketListener(event, cb);
  }

  // Эмит произвольного события. No-op если socket ещё не подключён.
  emit(event: string, data: unknown): void {
    this.socket?.emit(event, data);
  }

  // Регистрирует socket-listener (хранится в map + биндится на сокет если он есть).
  // unsubscribe чистит и map, и binding на сокете.
  private addSocketListener(event: string, cb: SocketListener): () => void {
    if (!this.socketListeners.has(event)) {
      this.socketListeners.set(event, new Set());
    }
    this.socketListeners.get(event)!.add(cb);
    this.socket?.on(event, cb);
    return () => {
      const set = this.socketListeners.get(event);
      if (set) {
        set.delete(cb);
        if (set.size === 0) this.socketListeners.delete(event);
      }
      this.socket?.off(event, cb);
    };
  }

  // Регистрирует manager-listener (хранится в map + биндится на manager если есть).
  // Manager-события (open/close/error/reconnect*) типизированы строго в socket.io,
  // но для динамической регистрации нам нужен string — оборачиваем в helper.
  private addManagerListener(event: string, cb: ManagerListener): () => void {
    if (!this.managerListeners.has(event)) {
      this.managerListeners.set(event, new Set());
    }
    this.managerListeners.get(event)!.add(cb);
    bindManagerEvent(this.socket, event, cb, "on");
    return () => {
      const set = this.managerListeners.get(event);
      if (set) {
        set.delete(cb);
        if (set.size === 0) this.managerListeners.delete(event);
      }
      bindManagerEvent(this.socket, event, cb, "off");
    };
  }
}

export const boardWsService = new BoardWsService();
export default boardWsService;
