import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import {
  CollaborationService,
  CanvasElementState,
  DrawingChunk,
} from './collaboration.service';
import {
  CLIENT_URL,
  JWT_SECRET,
  BOARDS_SERVICE,
  BOARDS_GRPC_SERVICE,
  IBoardsService,
} from '@app/common';
import {
  validateBoardId,
  validateCursorMove,
  validateElementCreate,
  validateElementUpdate,
  validateElementDelete,
  validateDrawingChunk,
} from '../validation/ws-validation';
import { WsRateLimiter, WS_RATE_LIMITS } from '../guards/ws-rate-limiter';


function extractToken(client: Socket): string | null {

  const authToken = client.handshake.auth?.token as string | undefined;
  if (authToken) return authToken.replace('Bearer ', '');

  const cookieHeader = (client.handshake.headers.cookie as string) ?? '';
  const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
  if (match?.[1]) return match[1];

  return null;
}

const BOARD_ACCESS_TTL = 300; // 5 минут

const DEFAULT_MAX_BOARD_ELEMENTS = 10_000;

@WebSocketGateway({
  cors: {
    origin:      CLIENT_URL,
    credentials: true,
  },
})
export class CollaborationGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private boardsService: IBoardsService;
  private heartbeatInterval: ReturnType<typeof setInterval>;
  private sweepInterval: ReturnType<typeof setInterval>;
  private initialSweepTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly rateLimiter = new WsRateLimiter();
  private static readonly HEARTBEAT_MS = 60_000;
  private static readonly SWEEP_MS = 5 * 60_000;
  private static readonly INITIAL_SWEEP_DELAY_MS = 10_000;

  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly jwtService: JwtService,
    @Inject(BOARDS_SERVICE) private readonly boardsClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.boardsService = this.boardsClient.getService<IBoardsService>(BOARDS_GRPC_SERVICE);

    // Периодический heartbeat: продляем TTL и проверяем JWT
    this.heartbeatInterval = setInterval(() => this.heartbeat(), CollaborationGateway.HEARTBEAT_MS);

    // Периодический sweep zombie-сокетов (записи в Redis без активного WS-соединения)
    this.sweepInterval = setInterval(
      () => this.cleanupZombieSockets().catch((e) => console.error('[WS] sweep error:', e)),
      CollaborationGateway.SWEEP_MS,
    );

    // Стартовый sweep — с задержкой, чтобы redis-adapter успел подсосать список сокетов
    // других инстансов кластера (если они есть). Иначе можем ошибочно удалить чужие.
    this.initialSweepTimeout = setTimeout(
      () => this.cleanupZombieSockets().catch((e) => console.error('[WS] initial sweep error:', e)),
      CollaborationGateway.INITIAL_SWEEP_DELAY_MS,
    );
  }

  async onModuleDestroy() {
    clearInterval(this.heartbeatInterval);
    clearInterval(this.sweepInterval);
    if (this.initialSweepTimeout) clearTimeout(this.initialSweepTimeout);
    this.rateLimiter.destroy();

    // Graceful shutdown: очищаем Redis-ключи всех подключённых сокетов
    if (!this.server?.sockets?.sockets) return;
    const cleanups: Promise<void>[] = [];
    for (const [, socket] of this.server.sockets.sockets) {
      const user = socket.data.user;
      if (!user) continue;
      cleanups.push(this.cleanupSocketAndBroadcast(user.id, socket.id));
    }
    await Promise.allSettled(cleanups);
    console.log(`[WS] Graceful shutdown: cleaned up ${cleanups.length} sockets`);
  }

  // Проверка rate limit. Возвращает true если запрос заблокирован.
  private checkRateLimit(client: Socket, event: string): boolean {
    const limit = WS_RATE_LIMITS[event];
    if (!limit) return false;
    if (!this.rateLimiter.allow(client.id, event, limit[0], limit[1])) {
      client.emit('board:error', { message: `Слишком много запросов (${event})` });
      return true;
    }
    return false;
  }

  // Обход всех подключённых сокетов: продление TTL + ревалидация JWT.
  // Также re-create presence в Redis, если ключи успели истечь между heartbeat'ами
  // (self-healing: socket.rooms — source of truth, переписываем в Redis).
  private async heartbeat(): Promise<void> {
    for (const [, socket] of this.server.sockets.sockets) {
      const user = socket.data.user;
      if (!user) continue;

      // Ревалидация JWT проверяем, что токен ещё валиден
      const token = extractToken(socket);
      if (token) {
        try {
          this.jwtService.verify(token, { secret: JWT_SECRET });
        } catch {
          console.warn(`[WS] Heartbeat: JWT expired for ${user.email}, disconnecting`);
          socket.emit('system:kicked', { reason: 'Сессия истекла' });
          socket.disconnect(true);
          continue;
        }
      }

      // Self-healing: source of truth — local socket.rooms. Перерегистрируем
      // user/board ключи в Redis, чтобы они не потерялись после случайного TTL miss.
      await this.collaborationService.trackUserSocket(user.id, socket.id);
      for (const room of socket.rooms) {
        if (!room.startsWith('board:')) continue;
        const boardId = room.slice('board:'.length);
        await this.collaborationService.joinBoard(boardId, user.id, socket.id, user);
      }
    }
  }

  // Удаляет из Redis записи о сокетах, которые больше не подключены ни к одному
  // инстансу кластера. Эмитит board:user_left для досок, где это был последний
  // сокет пользователя.
  private async cleanupZombieSockets(): Promise<void> {
    if (!this.server) return;

    const aliveSockets = new Set<string>();
    try {
      // С redis-adapter возвращает сокеты всех инстансов кластера
      const all = await this.server.fetchSockets();
      for (const s of all) aliveSockets.add(s.id);
    } catch {
      // Fallback на локальные сокеты, если adapter не сконфигурирован
      for (const [, s] of this.server.sockets.sockets) aliveSockets.add(s.id);
    }

    const pairs = await this.collaborationService.scanTrackedUserSockets();
    let cleanedCount = 0;
    for (const { userId, socketId } of pairs) {
      if (aliveSockets.has(socketId)) continue;
      const userLeftBoards = await this.collaborationService.cleanupSocketWithLastBoards(
        userId,
        socketId,
      );
      for (const boardId of userLeftBoards) {
        this.server.to(`board:${boardId}`).emit('board:user_left', { userId });
        this.server.to(`board:${boardId}`).emit('cursor:removed',  { userId });
      }
      cleanedCount++;
    }
    if (cleanedCount > 0) {
      console.log(`[WS] Cleanup: removed ${cleanedCount} zombie socket entries`);
    }
  }

  // Используется при graceful disconnect и shutdown: делает leaveBoard на каждой
  // доске, untrack сокета, и эмитит board:user_left только для досок, где это
  // был последний сокет пользователя.
  private async cleanupSocketAndBroadcast(userId: string, socketId: string): Promise<void> {
    const userLeftBoards = await this.collaborationService.cleanupSocketWithLastBoards(
      userId,
      socketId,
    );
    for (const boardId of userLeftBoards) {
      this.server.to(`board:${boardId}`).emit('board:user_left', { userId });
      this.server.to(`board:${boardId}`).emit('cursor:removed',  { userId });
    }
  }

  async handleConnection(client: Socket) {
    const token = extractToken(client);

    if (!token) {
      const cookieHeader = (client.handshake.headers.cookie as string) ?? '(empty)';
      console.warn(`[WS] No token found. cookies: ${cookieHeader.substring(0, 200)}`);
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token, { secret: JWT_SECRET });
      client.data.user = {
        id:     payload.sub,
        email:  payload.email,
        name:   payload.name   ?? '',
        avatar: payload.avatar ?? '',
        role:   payload.role,
      };
      await this.collaborationService.trackUserSocket(payload.sub, client.id);
      console.log(`[WS] Connected: ${client.data.user.email} (${client.id})`);
    } catch (e) {
      console.warn(`[WS] JWT verify failed: ${e}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.rateLimiter.removeSocket(client.id);
    if (!client.data.user) return;

    const userId = client.data.user.id;
    const boardIds = await this.collaborationService.getUserBoards(client.id);
    for (const boardId of boardIds) {
      const { wasLast } = await this.collaborationService.leaveBoard(
        boardId,
        userId,
        client.id,
      );
      // Эмитим user_left ТОЛЬКО когда это был последний сокет пользователя на доске.
      // При reconnect / multi-tab другие сокеты пользователя продолжают участвовать
      // в presence — лишних "ушёл/вернулся" в UI быть не должно.
      if (wasLast) {
        client.to(`board:${boardId}`).emit('board:user_left',   { userId });
        client.to(`board:${boardId}`).emit('cursor:removed',    { userId });
      }
    }
    await this.collaborationService.untrackUserSocket(userId, client.id);

    console.log(`[WS] Disconnected: ${client.data.user.email} (${client.id})`);
  }


  async disconnectUser(userId: string): Promise<number> {
    const socketIds = await this.collaborationService.getUserSocketIds(userId);
    let count = 0;
    for (const id of socketIds) {
      const socket = this.server.sockets.sockets.get(id);
      if (socket) {
        socket.emit('system:kicked', { reason: 'Disconnected by administrator' });
        socket.disconnect(true);
        count++;
      }
    }
    return count;
  }

  broadcastAll(message: string, type = 'info'): void {
    this.server.emit('system:broadcast', { message, type, sentAt: new Date().toISOString() });
  }
  private async verifyBoardAccess(
    boardId: string,
    userId: string,
  ): Promise<'granted' | 'denied' | 'unavailable'> {
    const cacheKey = `access:${boardId}:${userId}`;

    // Проверяем кеш (кешируем только подтверждённые результаты)
    const cached = await this.collaborationService.getRedis().get(cacheKey);
    if (cached === '1') return 'granted';
    if (cached === '0') return 'denied';

    try {
      await firstValueFrom(this.boardsService.getBoard({ id: boardId, userId }));
      await this.collaborationService.getRedis().set(cacheKey, '1', 'EX', BOARD_ACCESS_TTL);
      return 'granted';
    } catch (e: unknown) {
      const message: string =
        (e as { details?: string })?.details ??
        (e as { message?: string })?.message ??
        '';
      const isAccessDenied =
        message.includes('Нет доступа') ||
        message.includes('не найден') ||
        message.includes('not found');

      if (isAccessDenied) {
        await this.collaborationService.getRedis().set(cacheKey, '0', 'EX', 60);
        return 'denied';
      }
      console.error(`[WS] verifyBoardAccess: boards-service error for board ${boardId}:`, message);
      return 'unavailable';
    }
  }

  @SubscribeMessage('board:join')
  async handleJoinBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string },
  ) {
    if (this.checkRateLimit(client, 'board:join')) {
      return { ok: false, error: 'rate_limited' };
    }
    const err = validateBoardId(data);
    if (err) {
      client.emit('board:error', { message: err });
      return { ok: false, error: err };
    }

    const { boardId } = data;
    const user = client.data.user;


    const access = await this.verifyBoardAccess(boardId, user.id);
    if (access === 'denied') {
      client.emit('board:error', { message: 'Нет доступа к доске' });
      return { ok: false, error: 'access_denied' };
    }
    if (access === 'unavailable') {
      client.emit('board:error', { message: 'Сервис временно недоступен, повторите попытку' });
      return { ok: false, error: 'unavailable' };
    }

    // Шаг 1: вступаем в socket.io room СРАЗУ, чтобы не пропустить broadcast'ы от
    // других участников между этим моментом и завершением Redis-операций.
    client.join(`board:${boardId}`);

    try {
      // Шаг 2: атомарно регистрируем presence в Redis
      await this.collaborationService.joinBoard(boardId, user.id, client.id, user);

      // Шаг 3: читаем состояние доски и список online
      const [elements, users] = await Promise.all([
        this.collaborationService.getBoardElements(boardId),
        this.collaborationService.getBoardUsers(boardId),
      ]);

      console.log(`[WS] board:join boardId=${boardId} userId=${user.id} users=${users.length}`);

      client.emit('board:state', { elements, users });

      client.to(`board:${boardId}`).emit('board:user_joined', {
        user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
      });

      return { ok: true, users: users.length };
    } catch (e) {
      // Rollback: выходим из room, чтобы не получать broadcast'ы доски, в которой
      // не успели зарегистрироваться.
      client.leave(`board:${boardId}`);
      console.error(`[WS] board:join error:`, e);
      client.emit('board:error', { message: 'Не удалось присоединиться к доске' });
      return { ok: false, error: 'join_failed' };
    }
  }

  @SubscribeMessage('board:leave')
  async handleLeaveBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string },
  ) {
    if (this.checkRateLimit(client, 'board:leave')) return;
    const err = validateBoardId(data);
    if (err) { client.emit('board:error', { message: err }); return; }

    const { boardId } = data;
    const user = client.data.user;

    const { wasLast } = await this.collaborationService.leaveBoard(boardId, user.id, client.id);
    client.leave(`board:${boardId}`);

    if (wasLast) {
      client.to(`board:${boardId}`).emit('board:user_left',  { userId: user.id });
      client.to(`board:${boardId}`).emit('cursor:removed',   { userId: user.id });
    }
  }


  @SubscribeMessage('cursor:move')
  async handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string; x: number; y: number },
  ) {
    if (this.checkRateLimit(client, 'cursor:move')) return;
    const err = validateCursorMove(data);
    if (err) { client.emit('board:error', { message: err }); return; }

    const { boardId, x, y } = data;
    const user = client.data.user;

    await this.collaborationService.updateCursor(boardId, user.id, x, y);

    client.to(`board:${boardId}`).emit('cursor:updated', {
      userId: user.id,
      x,
      y,
      user: { name: user.name, avatar: user.avatar },
    });
  }

  @SubscribeMessage('element:drawing')
  async handleElementDrawing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string } & DrawingChunk,
  ) {
    if (this.checkRateLimit(client, 'element:drawing')) return;
    const err = validateDrawingChunk(data);
    if (err) { client.emit('board:error', { message: err }); return; }

    const { boardId, ...chunk } = data;
    const user = client.data.user;

    await this.collaborationService.setDrawing(boardId, user.id, chunk);

    client.to(`board:${boardId}`).emit('element:drawing', {
      userId: user.id,
      ...chunk,
    });
  }


  @SubscribeMessage('element:create')
  async handleElementCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string; element: Omit<CanvasElementState, 'id'> & { id?: string } },
  ) {
    if (this.checkRateLimit(client, 'element:create')) return;
    const err = validateElementCreate(data);
    if (err) { client.emit('board:error', { message: err }); return; }

    const { boardId, element } = data;
    const user = client.data.user;

    const maxElements = Number(process.env.MAX_BOARD_ELEMENTS ?? DEFAULT_MAX_BOARD_ELEMENTS);
    if (Number.isFinite(maxElements) && maxElements > 0) {
      const count = await this.collaborationService.getRedis().hlen(`board:${boardId}:elements`);
      if (count >= maxElements) {
        client.emit('board:error', { message: `Board element limit reached (${maxElements})` });
        return;
      }
    }

    const created = await this.collaborationService.createElement(boardId, {
      ...element,
      userId: user.id,
      boardId,
    });
    await this.collaborationService.clearDrawing(boardId, user.id);

    this.server.to(`board:${boardId}`).emit('element:created', { element: created });
  }

  @SubscribeMessage('element:update')
  async handleElementUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string; elementId: string; patch: Record<string, unknown> },
  ) {
    if (this.checkRateLimit(client, 'element:update')) return;
    const err = validateElementUpdate(data);
    if (err) { client.emit('board:error', { message: err }); return; }

    const { boardId, elementId, patch } = data;

    const updated = await this.collaborationService.updateElement(boardId, elementId, patch);
    if (!updated) return;

    this.server.to(`board:${boardId}`).emit('element:updated', { elementId, patch });
  }

  @SubscribeMessage('element:delete')
  async handleElementDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { boardId: string; elementIds: string[] },
  ) {
    if (this.checkRateLimit(client, 'element:delete')) return;
    const err = validateElementDelete(data);
    if (err) { client.emit('board:error', { message: err }); return; }

    const { boardId, elementIds } = data;

    await this.collaborationService.deleteElements(boardId, elementIds);
    this.server.to(`board:${boardId}`).emit('element:deleted', { elementIds });
  }
}
