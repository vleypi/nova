import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { Role } from '@app/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findBy: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatar: null,
  role: Role.USER,
  googleId: null,
  githubId: null,
  isBlocked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeQb = (rows: unknown[] = [], total = 0) => ({
  orderBy: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
  getRawMany: jest.fn().mockResolvedValue(rows),
});

describe('UsersService', () => {
  let service: UsersService;
  let module: TestingModule;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await module.close();
  });

  describe('findById', () => {
    it('returns user when repo finds it', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);

      await expect(service.findById('user-1')).resolves.toBe(user);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('throws RpcException when repo returns null', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(RpcException);
    });
  });

  describe('findByEmail', () => {
    it('returns whatever repo.findOne yields', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);

      await expect(service.findByEmail('test@example.com')).resolves.toBe(user);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('returns null when nobody matches', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findByEmail('nope@x.com')).resolves.toBeNull();
    });
  });

  describe('findAll', () => {
    it('uses defaults (page 1, limit 20) and computes totalPages', async () => {
      const qb = makeQb([makeUser()], 1);
      repo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.findAll();

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(res).toEqual({ users: [expect.any(Object)], total: 1, page: 1, totalPages: 1 });
    });

    it('clamps page below 1 up to 1', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.findAll({ page: -5, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(res.page).toBe(1);
    });

    it('clamps limit above 10000 down to 10000', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ limit: 99999 });

      expect(qb.take).toHaveBeenCalledWith(10000);
    });

    it('adds search filter when search is provided', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: 'Bob' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(LOWER(u.email) LIKE :q OR LOWER(u.name) LIKE :q)',
        { q: '%bob%' },
      );
    });

    it('adds role filter when role is a known Role enum value', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ role: Role.ADMIN });

      expect(qb.andWhere).toHaveBeenCalledWith('u.role = :role', { role: Role.ADMIN });
    });

    it('ignores unknown role value', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ role: 'WIZARD' });

      expect(qb.andWhere).not.toHaveBeenCalledWith('u.role = :role', expect.anything());
    });

    it('filters by active status', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ status: 'active' });

      expect(qb.andWhere).toHaveBeenCalledWith('u.isBlocked = :b', { b: false });
    });

    it('filters by blocked status', async () => {
      const qb = makeQb();
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ status: 'blocked' });

      expect(qb.andWhere).toHaveBeenCalledWith('u.isBlocked = :b', { b: true });
    });
  });

  describe('findManyByIds', () => {
    it('returns empty array immediately for empty input (no db call)', async () => {
      await expect(service.findManyByIds([])).resolves.toEqual([]);
      expect(repo.findBy).not.toHaveBeenCalled();
    });

    it('delegates to repo.findBy with In(...) for non-empty input', async () => {
      const users = [makeUser(), makeUser({ id: 'user-2' })];
      repo.findBy.mockResolvedValue(users);

      const res = await service.findManyByIds(['user-1', 'user-2']);

      expect(repo.findBy).toHaveBeenCalledTimes(1);
      const arg = repo.findBy.mock.calls[0][0];
      expect(arg.id._value).toEqual(['user-1', 'user-2']);
      expect(res).toBe(users);
    });
  });

  describe('create', () => {
    it('makes the very first user a SUPER_ADMIN', async () => {
      repo.count.mockResolvedValue(0);
      const created = makeUser({ role: Role.SUPER_ADMIN, name: 'first' });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const res = await service.create('first@x.com');

      expect(repo.create).toHaveBeenCalledWith({ email: 'first@x.com', role: Role.SUPER_ADMIN, name: 'first' });
      expect(res).toBe(created);
    });

    it('makes subsequent users plain USER and derives name from email prefix', async () => {
      repo.count.mockResolvedValue(7);
      const created = makeUser({ name: 'john' });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      await service.create('john@example.com');

      expect(repo.create).toHaveBeenCalledWith({ email: 'john@example.com', role: Role.USER, name: 'john' });
    });
  });

  describe('updateProfile', () => {
    it('updates fields and returns the refreshed user', async () => {
      const updated = makeUser({ name: 'New Name' });
      repo.update.mockResolvedValue(undefined);
      repo.findOne.mockResolvedValue(updated);

      const res = await service.updateProfile('user-1', { name: 'New Name' });

      expect(repo.update).toHaveBeenCalledWith('user-1', { name: 'New Name' });
      expect(res).toBe(updated);
    });

    it('propagates RpcException if user disappeared between update and refetch', async () => {
      repo.update.mockResolvedValue(undefined);
      repo.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('user-1', { name: 'X' })).rejects.toThrow(RpcException);
    });
  });

  describe('updateRole', () => {
    it('updates role and returns the refreshed user', async () => {
      const updated = makeUser({ role: Role.ADMIN });
      repo.update.mockResolvedValue(undefined);
      repo.findOne.mockResolvedValue(updated);

      const res = await service.updateRole('user-1', Role.ADMIN);

      expect(repo.update).toHaveBeenCalledWith('user-1', { role: Role.ADMIN });
      expect(res.role).toBe(Role.ADMIN);
    });
  });

  describe('blockUser', () => {
    it('sets isBlocked and returns the refreshed user', async () => {
      const blocked = makeUser({ isBlocked: true });
      repo.update.mockResolvedValue(undefined);
      repo.findOne.mockResolvedValue(blocked);

      const res = await service.blockUser('user-1', true);

      expect(repo.update).toHaveBeenCalledWith('user-1', { isBlocked: true });
      expect(res.isBlocked).toBe(true);
    });
  });

  describe('deleteUser', () => {
    it('finds the user first, then removes it', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);
      repo.remove.mockResolvedValue(user);

      await service.deleteUser('user-1');

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(repo.remove).toHaveBeenCalledWith(user);
    });

    it('throws and does not call remove if user does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.deleteUser('missing')).rejects.toThrow(RpcException);
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });

  describe('linkProvider', () => {
    it('throws on unknown provider name', async () => {
      await expect(service.linkProvider('user-1', 'facebook', 'fb-1')).rejects.toThrow(RpcException);
    });

    it('throws on empty providerId', async () => {
      await expect(service.linkProvider('user-1', 'google', '')).rejects.toThrow(RpcException);
    });

    it('throws PROVIDER_ALREADY_LINKED if another user already owns this providerId', async () => {
      repo.findOne.mockResolvedValueOnce(makeUser({ id: 'someone-else' }));

      await expect(service.linkProvider('user-1', 'google', 'g-1'))
        .rejects.toThrow('PROVIDER_ALREADY_LINKED');
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('links google provider when providerId is free', async () => {
      const updated = makeUser({ googleId: 'g-1' });
      repo.findOne
        .mockResolvedValueOnce(null) // first call: lookup by providerId
        .mockResolvedValueOnce(updated); // second call: findById refetch
      repo.update.mockResolvedValue(undefined);

      const res = await service.linkProvider('user-1', 'google', 'g-1');

      expect(repo.update).toHaveBeenCalledWith('user-1', { googleId: 'g-1' });
      expect(res).toBe(updated);
    });

    it('links github provider with githubId field', async () => {
      const updated = makeUser({ githubId: 'gh-1' });
      repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(updated);
      repo.update.mockResolvedValue(undefined);

      await service.linkProvider('user-1', 'github', 'gh-1');

      expect(repo.update).toHaveBeenCalledWith('user-1', { githubId: 'gh-1' });
    });
  });

  describe('findByProviderId', () => {
    it('returns null for unknown provider without touching repo', async () => {
      await expect(service.findByProviderId('vk', 'vk-1')).resolves.toBeNull();
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('returns null for empty providerId', async () => {
      await expect(service.findByProviderId('google', '')).resolves.toBeNull();
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('looks up googleId for google provider', async () => {
      const user = makeUser({ googleId: 'g-1' });
      repo.findOne.mockResolvedValue(user);

      await expect(service.findByProviderId('google', 'g-1')).resolves.toBe(user);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { googleId: 'g-1' } });
    });

    it('looks up githubId for github provider', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.findByProviderId('github', 'gh-1');

      expect(repo.findOne).toHaveBeenCalledWith({ where: { githubId: 'gh-1' } });
    });
  });

  describe('unlinkProvider', () => {
    it('throws on unknown provider', async () => {
      await expect(service.unlinkProvider('user-1', 'vk')).rejects.toThrow(RpcException);
    });

    it('clears googleId for google provider', async () => {
      repo.update.mockResolvedValue(undefined);
      repo.findOne.mockResolvedValue(makeUser());

      await service.unlinkProvider('user-1', 'google');

      expect(repo.update).toHaveBeenCalledWith('user-1', { googleId: null });
    });

    it('clears githubId for github provider', async () => {
      repo.update.mockResolvedValue(undefined);
      repo.findOne.mockResolvedValue(makeUser());

      await service.unlinkProvider('user-1', 'github');

      expect(repo.update).toHaveBeenCalledWith('user-1', { githubId: null });
    });
  });

  describe('getStats', () => {
    it('returns totals from three count queries', async () => {
      repo.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(5)   // blockedUsers
        .mockResolvedValueOnce(7);  // todayUsers

      const res = await service.getStats();

      expect(res).toEqual({ totalUsers: 100, todayUsers: 7, blockedUsers: 5 });
    });
  });

  describe('getCreatedByMonth', () => {
    it('passes raw rows to fillMonthlyBuckets and returns an array of length=months', async () => {
      const qb = makeQb([]);
      repo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.getCreatedByMonth(6);

      expect(res).toHaveLength(6);
      expect(res.every(n => n === 0)).toBe(true);
      expect(qb.getRawMany).toHaveBeenCalledTimes(1);
    });
  });
});
