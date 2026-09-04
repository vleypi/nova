import { Test, TestingModule } from '@nestjs/testing';
import { CollaborationService, OnlineUser } from './collaboration.service';

const mockRedis = () => ({
  sadd: jest.fn(),
  srem: jest.fn(),
  scard: jest.fn(),
  smembers: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hlen: jest.fn(),
  hget: jest.fn(),
  hgetall: jest.fn(),
  set: jest.fn(),
  eval: jest.fn(),
  scan: jest.fn(),
});

const makeUser = (overrides: Partial<OnlineUser> = {}): OnlineUser => ({
  id: 'user-1',
  email: 'u@x.com',
  name: 'Some User',
  avatar: '',
  ...overrides,
});

describe('CollaborationService', () => {
  let service: CollaborationService;
  let module: TestingModule;
  let redis: ReturnType<typeof mockRedis>;

  beforeEach(async () => {
    redis = mockRedis();

    module = await Test.createTestingModule({
      providers: [
        CollaborationService,
        { provide: 'REDIS_CLIENT', useValue: redis },
      ],
    }).compile();

    service = module.get(CollaborationService);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await module.close();
  });

  describe('trackUserSocket', () => {
    it('adds socket id to set and refreshes TTL', async () => {
      await service.trackUserSocket('user-1', 'sock-1');

      expect(redis.sadd).toHaveBeenCalledWith('user:user-1:sockets', 'sock-1');
      expect(redis.expire).toHaveBeenCalledWith('user:user-1:sockets', 120);
    });
  });

  describe('untrackUserSocket', () => {
    it('removes socket but keeps key if other sockets remain', async () => {
      redis.scard.mockResolvedValue(2);

      await service.untrackUserSocket('user-1', 'sock-1');

      expect(redis.srem).toHaveBeenCalledWith('user:user-1:sockets', 'sock-1');
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('deletes the key when the last socket is removed', async () => {
      redis.scard.mockResolvedValue(0);

      await service.untrackUserSocket('user-1', 'sock-1');

      expect(redis.del).toHaveBeenCalledWith('user:user-1:sockets');
    });
  });

  describe('refreshSocketTTL', () => {
    it('extends TTL for user, socket, board hash и board:user:sockets set каждой доски', async () => {
      redis.smembers.mockResolvedValue(['board-1', 'board-2']);

      await service.refreshSocketTTL('user-1', 'sock-1');

      expect(redis.expire).toHaveBeenCalledWith('user:user-1:sockets', 120);
      expect(redis.expire).toHaveBeenCalledWith('socket:sock-1:boards', 120);
      expect(redis.expire).toHaveBeenCalledWith('board:board-1:users', 180);
      expect(redis.expire).toHaveBeenCalledWith('board:board-1:user:user-1:sockets', 180);
      expect(redis.expire).toHaveBeenCalledWith('board:board-2:users', 180);
      expect(redis.expire).toHaveBeenCalledWith('board:board-2:user:user-1:sockets', 180);
    });
  });

  describe('cleanupSocket', () => {
    it('leaves every board the socket joined and untracks the socket', async () => {
      redis.smembers.mockResolvedValue(['board-1']);
      // eval = 1 → leaveBoard сообщает wasLast (последний сокет на доске)
      redis.eval.mockResolvedValue(1);
      redis.scard.mockResolvedValue(0);

      await service.cleanupSocket('user-1', 'sock-1');

      expect(redis.eval).toHaveBeenCalledWith(
        expect.any(String),
        5,
        'board:board-1:users',
        'board:board-1:user:user-1:sockets',
        'socket:sock-1:boards',
        'board:board-1:cursor:user-1',
        'board:board-1:drawing:user-1',
        'user-1',
        'sock-1',
        'board-1',
      );
      expect(redis.srem).toHaveBeenCalledWith('user:user-1:sockets', 'sock-1');
    });
  });

  describe('joinBoard', () => {
    it('делает Lua-вызов с правильными KEYS и ARGV', async () => {
      const user = makeUser();

      await service.joinBoard('board-1', 'user-1', 'sock-1', user);

      expect(redis.eval).toHaveBeenCalledWith(
        expect.any(String),
        3,
        'board:board-1:users',
        'board:board-1:user:user-1:sockets',
        'socket:sock-1:boards',
        'user-1',
        'sock-1',
        JSON.stringify(user),
        'board-1',
        '180',
        '120',
      );
    });
  });

  describe('leaveBoard', () => {
    it('возвращает wasLast=true когда Lua сообщает 1 (последний сокет ушёл)', async () => {
      redis.eval.mockResolvedValue(1);

      const result = await service.leaveBoard('board-1', 'user-1', 'sock-1');

      expect(result).toEqual({ wasLast: true });
      expect(redis.eval).toHaveBeenCalledWith(
        expect.any(String),
        5,
        'board:board-1:users',
        'board:board-1:user:user-1:sockets',
        'socket:sock-1:boards',
        'board:board-1:cursor:user-1',
        'board:board-1:drawing:user-1',
        'user-1',
        'sock-1',
        'board-1',
      );
    });

    it('возвращает wasLast=false когда у пользователя ещё есть другие сокеты на доске', async () => {
      redis.eval.mockResolvedValue(0);

      const result = await service.leaveBoard('board-1', 'user-1', 'sock-1');

      expect(result).toEqual({ wasLast: false });
    });

    it('многосокетный сценарий: 2 вкладки — закрытие 1й не выгоняет пользователя', async () => {
      // join сокета A (вкладка 1)
      redis.eval.mockResolvedValueOnce(1);  // sadd
      await service.joinBoard('board-1', 'user-1', 'sockA', makeUser());

      // join сокета B (вкладка 2)
      redis.eval.mockResolvedValueOnce(1);
      await service.joinBoard('board-1', 'user-1', 'sockB', makeUser());

      // disconnect сокета A: Lua возвращает 0 — у пользователя остался сокет B
      redis.eval.mockResolvedValueOnce(0);
      const r1 = await service.leaveBoard('board-1', 'user-1', 'sockA');
      expect(r1.wasLast).toBe(false);

      // disconnect сокета B: теперь Lua возвращает 1 — последний сокет ушёл
      redis.eval.mockResolvedValueOnce(1);
      const r2 = await service.leaveBoard('board-1', 'user-1', 'sockB');
      expect(r2.wasLast).toBe(true);
    });
  });

  describe('cleanupSocketWithLastBoards', () => {
    it('возвращает доски, на которых сокет был последним сокетом пользователя', async () => {
      redis.smembers.mockResolvedValue(['board-1', 'board-2']);
      redis.eval
        .mockResolvedValueOnce(1)  // board-1: wasLast
        .mockResolvedValueOnce(0); // board-2: НЕ wasLast
      redis.scard.mockResolvedValue(0);

      const result = await service.cleanupSocketWithLastBoards('user-1', 'sock-1');

      expect(result).toEqual(['board-1']);
      expect(redis.srem).toHaveBeenCalledWith('user:user-1:sockets', 'sock-1');
    });

    it('пустой список если сокет не был зарегистрирован ни на одной доске', async () => {
      redis.smembers.mockResolvedValue([]);
      redis.scard.mockResolvedValue(0);

      const result = await service.cleanupSocketWithLastBoards('user-1', 'sock-1');

      expect(result).toEqual([]);
    });
  });

  describe('scanTrackedUserSockets', () => {
    it('возвращает пустой массив если в Redis нет user:*:sockets ключей', async () => {
      redis.scan.mockResolvedValueOnce(['0', []]);

      const result = await service.scanTrackedUserSockets();

      expect(result).toEqual([]);
    });

    it('итерируется по cursor и собирает все (userId, socketId) пары', async () => {
      redis.scan
        .mockResolvedValueOnce(['42', ['user:u1:sockets']])
        .mockResolvedValueOnce(['0',  ['user:u2:sockets']]);
      redis.smembers
        .mockResolvedValueOnce(['s1', 's2'])
        .mockResolvedValueOnce(['s3']);

      const result = await service.scanTrackedUserSockets();

      expect(result).toEqual([
        { userId: 'u1', socketId: 's1' },
        { userId: 'u1', socketId: 's2' },
        { userId: 'u2', socketId: 's3' },
      ]);
    });
  });

  describe('getBoardUsers', () => {
    it('returns empty array when board has no users', async () => {
      redis.hgetall.mockResolvedValue({});

      await expect(service.getBoardUsers('board-1')).resolves.toEqual([]);
    });

    it('parses every hash value back into an OnlineUser', async () => {
      const u1 = makeUser({ id: 'a' });
      const u2 = makeUser({ id: 'b' });
      redis.hgetall.mockResolvedValue({ a: JSON.stringify(u1), b: JSON.stringify(u2) });

      await expect(service.getBoardUsers('board-1')).resolves.toEqual([u1, u2]);
    });
  });

  describe('updateCursor', () => {
    it('stores the cursor with a 30s TTL', async () => {
      await service.updateCursor('board-1', 'user-1', 10, 20);

      expect(redis.set).toHaveBeenCalledWith(
        'board:board-1:cursor:user-1',
        JSON.stringify({ x: 10, y: 20 }),
        'EX',
        30,
      );
    });
  });

  describe('setDrawing / clearDrawing', () => {
    it('setDrawing stores the chunk with a 10s TTL', async () => {
      const chunk = { elementId: 'e1', points: [{ x: 1, y: 2 }], color: '#000', width: 2 };

      await service.setDrawing('board-1', 'user-1', chunk);

      expect(redis.set).toHaveBeenCalledWith(
        'board:board-1:drawing:user-1',
        JSON.stringify(chunk),
        'EX',
        10,
      );
    });

    it('clearDrawing removes the drawing key', async () => {
      await service.clearDrawing('board-1', 'user-1');

      expect(redis.del).toHaveBeenCalledWith('board:board-1:drawing:user-1');
    });
  });

  describe('getBoardElements', () => {
    it('returns empty array for empty hash', async () => {
      redis.hgetall.mockResolvedValue({});

      await expect(service.getBoardElements('board-1')).resolves.toEqual([]);
    });

    it('parses each element from JSON', async () => {
      const el = { id: 'el-1', type: 'rect', userId: 'u', boardId: 'board-1', createdAt: 1 };
      redis.hgetall.mockResolvedValue({ 'el-1': JSON.stringify(el) });

      await expect(service.getBoardElements('board-1')).resolves.toEqual([el]);
    });
  });

  describe('createElement', () => {
    it('uses provided id and returns the created element when Lua succeeds', async () => {
      redis.eval.mockResolvedValue('ok');

      const res = await service.createElement('board-1', {
        id: 'el-42',
        type: 'rect',
        userId: 'u-1',
        boardId: 'ignored',
        createdAt: 100,
      });

      expect(res.id).toBe('el-42');
      expect(res.boardId).toBe('board-1');
      expect(redis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'board:board-1:elements',
        'el-42',
        expect.any(String),
      );
    });

    it('generates a uuid when no id is provided', async () => {
      redis.eval.mockResolvedValue('ok');

      const res = await service.createElement('board-1', {
        type: 'rect',
        userId: 'u-1',
        boardId: 'board-1',
        createdAt: 100,
      });

      expect(res.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('falls back to existing element when Lua returns null (duplicate id)', async () => {
      const existing = { id: 'el-1', type: 'rect', userId: 'u', boardId: 'board-1', createdAt: 1 };
      redis.eval.mockResolvedValue(null);
      redis.hget.mockResolvedValue(JSON.stringify(existing));

      const res = await service.createElement('board-1', {
        id: 'el-1',
        type: 'rect',
        userId: 'u-1',
        boardId: 'board-1',
        createdAt: 999,
      });

      expect(res).toEqual(existing);
    });

    it('returns the locally built element if duplicate occurred but hget produced nothing', async () => {
      redis.eval.mockResolvedValue(null);
      redis.hget.mockResolvedValue(null);

      const res = await service.createElement('board-1', {
        id: 'el-1',
        type: 'rect',
        userId: 'u-1',
        boardId: 'board-1',
        createdAt: 1,
      });

      expect(res.id).toBe('el-1');
    });
  });

  describe('updateElement', () => {
    it('returns parsed element when Lua returns a string', async () => {
      const updated = { id: 'el-1', type: 'rect', userId: 'u', boardId: 'board-1', createdAt: 1, color: '#fff' };
      redis.eval.mockResolvedValue(JSON.stringify(updated));

      const res = await service.updateElement('board-1', 'el-1', { color: '#fff' });

      expect(res).toEqual(updated);
    });

    it('returns null when Lua returns null (element does not exist)', async () => {
      redis.eval.mockResolvedValue(null);

      await expect(service.updateElement('board-1', 'el-1', {})).resolves.toBeNull();
    });
  });

  describe('deleteElements', () => {
    it('does nothing for empty id list', async () => {
      await service.deleteElements('board-1', []);

      expect(redis.hdel).not.toHaveBeenCalled();
    });

    it('spreads the ids into a single hdel call', async () => {
      await service.deleteElements('board-1', ['a', 'b', 'c']);

      expect(redis.hdel).toHaveBeenCalledWith('board:board-1:elements', 'a', 'b', 'c');
    });
  });

  describe('getAllOnlineBoards', () => {
    it('returns empty list when scan yields no keys', async () => {
      redis.scan.mockResolvedValueOnce(['0', []]);

      const res = await service.getAllOnlineBoards();

      expect(res).toEqual([]);
    });

    it('iterates the cursor until it returns 0 and skips boards with no users', async () => {
      redis.scan
        .mockResolvedValueOnce(['42', ['board:b1:users']])
        .mockResolvedValueOnce(['0', ['board:b2:users']]);
      redis.hgetall
        .mockResolvedValueOnce({ u: JSON.stringify(makeUser()) }) // b1 has a user
        .mockResolvedValueOnce({});                                // b2 empty, skipped

      const res = await service.getAllOnlineBoards();

      expect(redis.scan).toHaveBeenCalledTimes(2);
      expect(res).toHaveLength(1);
      expect(res[0].boardId).toBe('b1');
    });
  });
});
