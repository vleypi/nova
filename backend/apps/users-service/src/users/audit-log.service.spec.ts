import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Like } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditLog } from './entities/audit-log.entity';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findAndCount: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makeLog = (overrides: Partial<AuditLog> = {}): AuditLog => ({
  id: 'log-1',
  actorId: 'actor-1',
  actorEmail: 'actor@x.com',
  action: 'USER_BLOCK',
  targetId: 'target-1',
  targetType: 'user',
  details: null,
  createdAt: new Date(),
  ...overrides,
});

describe('AuditLogService', () => {
  let service: AuditLogService;
  let module: TestingModule;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLog), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(AuditLogService);
    repo = module.get(getRepositoryToken(AuditLog));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await module.close();
  });

  describe('create', () => {
    it('builds an entity and saves it', async () => {
      const data = { actorId: 'a', actorEmail: 'a@x', action: 'X' };
      const entity = makeLog();
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const res = await service.create(data);

      expect(repo.create).toHaveBeenCalledWith(data);
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(res).toBe(entity);
    });
  });

  describe('findAll', () => {
    it('uses defaults (page=1, limit=20) when called without args', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const res = await service.findAll();

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(res).toEqual({ logs: [], total: 0, page: 1, totalPages: 0 });
    });

    it('builds Like filter when action is provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 20, 'BLOCK');

      const call = repo.findAndCount.mock.calls[0][0];
      expect(call.where.action).toEqual(Like('%BLOCK%'));
    });

    it('filters by actorId and targetId when provided', async () => {
      repo.findAndCount.mockResolvedValue([[makeLog()], 1]);

      await service.findAll(2, 5, undefined, 'actor-1', 'target-1');

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: { actorId: 'actor-1', targetId: 'target-1' },
        order: { createdAt: 'DESC' },
        skip: 5, // (2-1)*5
        take: 5,
      });
    });

    it('computes totalPages from total/limit', async () => {
      repo.findAndCount.mockResolvedValue([[], 23]);

      const res = await service.findAll(1, 10);

      expect(res.totalPages).toBe(3);
    });
  });

  describe('getActivityByDay', () => {
    it('returns daily array of given length and total=0 for empty result', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.getActivityByDay(7);

      expect(res.daily).toHaveLength(7);
      expect(res.daily.every(n => n === 0)).toBe(true);
      expect(res.total).toBe(0);
    });

    it('sums counts across rows for total', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { bucket: today, count: '3' },
        ]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.getActivityByDay(3);

      expect(res.total).toBe(3);
      expect(res.daily).toHaveLength(3);
    });
  });
});
