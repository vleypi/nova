import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

export interface OnlineUser {
  id:     string;
  email:  string;
  name:   string;
  avatar: string;
}
export type CanvasElementState = {
  id:               string;
  type:             string;
  userId:           string;
  boardId:          string;
  createdAt:        number;
  aiTransactionId?: string;
} & Record<string, unknown>;

export interface DrawingChunk {
  elementId: string;
  points:    Array<{ x: number; y: number }>;
  color:     string;
  width:     number;
}

// Lua-скрипт: атомарный update элемента в Redis Hash
const LUA_UPDATE_ELEMENT = `
local key = KEYS[1]
local elementId = ARGV[1]
local patchJson = ARGV[2]

local raw = redis.call('HGET', key, elementId)
if not raw then return nil end

local element = cjson.decode(raw)
local patch = cjson.decode(patchJson)

for k, v in pairs(patch) do
  element[k] = v
end
element['id'] = elementId

local updated = cjson.encode(element)
redis.call('HSET', key, elementId, updated)
return updated
`;

// Lua-скрипт
const LUA_CREATE_ELEMENT = `
local key = KEYS[1]
local elementId = ARGV[1]
local elementJson = ARGV[2]

local exists = redis.call('HEXISTS', key, elementId)
if exists == 1 then return nil end

redis.call('HSET', key, elementId, elementJson)
return elementJson
`;

// Атомарный join: одной операцией добавляем socket в presence-set пользователя
// на доске, обновляем hash users и регистрируем доску за сокетом. Не зависит
// от прежних значений и идемпотентен по (boardId, userId, socketId).
const LUA_JOIN_BOARD = `
local usersKey = KEYS[1]
local boardUserSocketsKey = KEYS[2]
local socketBoardsKey = KEYS[3]

local userId = ARGV[1]
local socketId = ARGV[2]
local userJson = ARGV[3]
local boardId = ARGV[4]
local presenceTtl = tonumber(ARGV[5])
local socketTtl = tonumber(ARGV[6])

redis.call('SADD', boardUserSocketsKey, socketId)
redis.call('EXPIRE', boardUserSocketsKey, presenceTtl)

redis.call('HSET', usersKey, userId, userJson)
redis.call('EXPIRE', usersKey, presenceTtl)

redis.call('SADD', socketBoardsKey, boardId)
redis.call('EXPIRE', socketBoardsKey, socketTtl)

return 1
`;

// Атомарный leave: удаляем socketId из presence-set пользователя на доске.
// Hash users и cursor/drawing очищаем ТОЛЬКО когда у пользователя не осталось
// активных сокетов на этой доске (счётчик ссылок == 0). Возвращает 1, если
// это был последний сокет пользователя на доске (значит, пора эмитить user_left).
const LUA_LEAVE_BOARD = `
local usersKey = KEYS[1]
local boardUserSocketsKey = KEYS[2]
local socketBoardsKey = KEYS[3]
local cursorKey = KEYS[4]
local drawingKey = KEYS[5]

local userId = ARGV[1]
local socketId = ARGV[2]
local boardId = ARGV[3]

redis.call('SREM', boardUserSocketsKey, socketId)
redis.call('SREM', socketBoardsKey, boardId)

local remaining = redis.call('SCARD', boardUserSocketsKey)
if remaining == 0 then
  redis.call('HDEL', usersKey, userId)
  redis.call('DEL', boardUserSocketsKey)
  redis.call('DEL', cursorKey)
  redis.call('DEL', drawingKey)
  local totalUsers = redis.call('HLEN', usersKey)
  if totalUsers == 0 then
    redis.call('DEL', usersKey)
  end
  return 1
end

return 0
`;

@Injectable()
export class CollaborationService {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  private static readonly SOCKET_KEY_TTL = 120; // 2 минуты
  private static readonly BOARD_PRESENCE_TTL = 180; // 3 минуты

  getRedis(): Redis {
    return this.redis;
  }

  async trackUserSocket(userId: string, socketId: string): Promise<void> {
    const key = `user:${userId}:sockets`;
    await this.redis.sadd(key, socketId);
    await this.redis.expire(key, CollaborationService.SOCKET_KEY_TTL);
  }

  async untrackUserSocket(userId: string, socketId: string): Promise<void> {
    const key = `user:${userId}:sockets`;
    await this.redis.srem(key, socketId);
    const remaining = await this.redis.scard(key);
    if (remaining === 0) await this.redis.del(key);
  }

  async getUserSocketIds(userId: string): Promise<string[]> {
    return this.redis.smembers(`user:${userId}:sockets`);
  }

  async refreshSocketTTL(userId: string, socketId: string): Promise<void> {
    await this.redis.expire(`user:${userId}:sockets`, CollaborationService.SOCKET_KEY_TTL);
    await this.redis.expire(`socket:${socketId}:boards`, CollaborationService.SOCKET_KEY_TTL);
    const boardIds = await this.getUserBoards(socketId);
    for (const boardId of boardIds) {
      await this.redis.expire(`board:${boardId}:users`, CollaborationService.BOARD_PRESENCE_TTL);
      await this.redis.expire(
        `board:${boardId}:user:${userId}:sockets`,
        CollaborationService.BOARD_PRESENCE_TTL,
      );
    }
  }

  async cleanupSocket(userId: string, socketId: string): Promise<void> {
    const boardIds = await this.getUserBoards(socketId);
    for (const boardId of boardIds) {
      await this.leaveBoard(boardId, userId, socketId);
    }
    await this.untrackUserSocket(userId, socketId);
  }

  // Регистрирует socketId в presence пользователя на доске. Идемпотентен:
  // повторный вызов с тем же socketId ничего не ломает.
  async joinBoard(
    boardId:  string,
    userId:   string,
    socketId: string,
    user:     OnlineUser,
  ): Promise<void> {
    const usersKey            = `board:${boardId}:users`;
    const boardUserSocketsKey = `board:${boardId}:user:${userId}:sockets`;
    const socketBoardsKey     = `socket:${socketId}:boards`;

    await this.redis.eval(
      LUA_JOIN_BOARD,
      3,
      usersKey, boardUserSocketsKey, socketBoardsKey,
      userId,
      socketId,
      JSON.stringify(user),
      boardId,
      String(CollaborationService.BOARD_PRESENCE_TTL),
      String(CollaborationService.SOCKET_KEY_TTL),
    );
  }

  // Снимает socketId с presence пользователя на доске. Возвращает wasLast=true,
  // если этот сокет был последним сокетом пользователя на доске — тогда
  // вызывающему стоит эмитить board:user_left.
  async leaveBoard(
    boardId:  string,
    userId:   string,
    socketId: string,
  ): Promise<{ wasLast: boolean }> {
    const usersKey            = `board:${boardId}:users`;
    const boardUserSocketsKey = `board:${boardId}:user:${userId}:sockets`;
    const socketBoardsKey     = `socket:${socketId}:boards`;
    const cursorKey           = `board:${boardId}:cursor:${userId}`;
    const drawingKey          = `board:${boardId}:drawing:${userId}`;

    const result = await this.redis.eval(
      LUA_LEAVE_BOARD,
      5,
      usersKey, boardUserSocketsKey, socketBoardsKey, cursorKey, drawingKey,
      userId,
      socketId,
      boardId,
    );

    return { wasLast: result === 1 };
  }

  async getBoardUsers(boardId: string): Promise<OnlineUser[]> {
    const hash = await this.redis.hgetall(`board:${boardId}:users`);
    if (!hash) return [];
    return Object.values(hash).map((v) => JSON.parse(v));
  }

  async getUserBoards(socketId: string): Promise<string[]> {
    return this.redis.smembers(`socket:${socketId}:boards`);
  }

  async updateCursor(boardId: string, userId: string, x: number, y: number): Promise<void> {
    await this.redis.set(
      `board:${boardId}:cursor:${userId}`,
      JSON.stringify({ x, y }),
      'EX',
      30,
    );
  }


  async setDrawing(boardId: string, userId: string, chunk: DrawingChunk): Promise<void> {
    await this.redis.set(
      `board:${boardId}:drawing:${userId}`,
      JSON.stringify(chunk),
      'EX',
      10,
    );
  }

  async clearDrawing(boardId: string, userId: string): Promise<void> {
    await this.redis.del(`board:${boardId}:drawing:${userId}`);
  }

  async getBoardElements(boardId: string): Promise<CanvasElementState[]> {
    const hash = await this.redis.hgetall(`board:${boardId}:elements`);
    if (!hash) return [];
    return Object.values(hash).map((v) => JSON.parse(v));
  }

  async createElement(
    boardId:  string,
    element:  Omit<CanvasElementState, 'id'> & { id?: string },
  ): Promise<CanvasElementState> {
    const created = {
      ...element,
      id:       element.id ?? randomUUID(),
      boardId,
    } as CanvasElementState;

    const result = await this.redis.eval(
      LUA_CREATE_ELEMENT,
      1,
      `board:${boardId}:elements`,
      created.id,
      JSON.stringify(created),
    );

    if (!result) {
      const existing = await this.redis.hget(`board:${boardId}:elements`, created.id);
      return existing ? JSON.parse(existing) : created;
    }

    return created;
  }

  async updateElement(
    boardId:   string,
    elementId: string,
    patch:     Record<string, unknown>,
  ): Promise<CanvasElementState | null> {
    const result = await this.redis.eval(
      LUA_UPDATE_ELEMENT,
      1,
      `board:${boardId}:elements`,
      elementId,
      JSON.stringify(patch),
    );

    if (!result) return null;
    return JSON.parse(result as string);
  }

  async deleteElements(boardId: string, elementIds: string[]): Promise<void> {
    if (elementIds.length === 0) return;
    await this.redis.hdel(`board:${boardId}:elements`, ...elementIds);
  }

  async getAllOnlineBoards(): Promise<{ boardId: string; users: OnlineUser[] }[]> {
    const result: { boardId: string; users: OnlineUser[] }[] = [];
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', 'board:*:users', 'COUNT', 100);
      cursor = next;
      for (const key of keys) {
        const boardId = key.replace(/^board:/, '').replace(/:users$/, '');
        const users = await this.getBoardUsers(boardId);
        if (users.length > 0) result.push({ boardId, users });
      }
    } while (cursor !== '0');

    return result;
  }

  // Возвращает все пары (userId, socketId), зарегистрированные в Redis.
  // Используется для cleanup zombie-сокетов при старте сервиса и периодическом
  // sweep (см. CollaborationGateway.onModuleInit и cleanupZombieSockets).
  async scanTrackedUserSockets(): Promise<Array<{ userId: string; socketId: string }>> {
    const pairs: Array<{ userId: string; socketId: string }> = [];
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', 'user:*:sockets', 'COUNT', 100);
      cursor = next;
      for (const key of keys) {
        const match = key.match(/^user:(.+):sockets$/);
        if (!match?.[1]) continue;
        const userId = match[1];
        const socketIds = await this.redis.smembers(key);
        for (const socketId of socketIds) {
          pairs.push({ userId, socketId });
        }
      }
    } while (cursor !== '0');
    return pairs;
  }

  // Полная очистка для пришедшего извне socketId: для каждой доски, в которой
  // он зарегистрирован, делаем leaveBoard. Возвращает массив досок, на которых
  // пользователь полностью покинул присутствие (wasLast=true) — вызывающему
  // нужно эмитить board:user_left на эти доски.
  async cleanupSocketWithLastBoards(
    userId:   string,
    socketId: string,
  ): Promise<string[]> {
    const boardIds = await this.getUserBoards(socketId);
    const userLeftBoards: string[] = [];
    for (const boardId of boardIds) {
      const { wasLast } = await this.leaveBoard(boardId, userId, socketId);
      if (wasLast) userLeftBoards.push(boardId);
    }
    await this.untrackUserSocket(userId, socketId);
    return userLeftBoards;
  }
}
