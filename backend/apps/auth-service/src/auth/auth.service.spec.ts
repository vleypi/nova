import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { RpcException } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import {
  USERS_SERVICE,
  UserPayload,
  JWT_SECRET,
  JWT_ACCESS_EXPIRES,
  JWT_REFRESH_EXPIRES,
  Role,
} from '@app/common';
import { OTP_TTL_SECONDS, REFRESH_TTL_SECONDS } from '@app/common/constants';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';

const makeUser = (overrides: Partial<UserPayload> = {}): UserPayload => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatar: null,
  role: Role.USER,
  googleId: null,
  githubId: null,
  isBlocked: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const mockRedis = () => ({
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
});

const mockUsersService = () => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByProviderId: jest.fn(),
  create: jest.fn(),
  updateProfile: jest.fn(),
  linkProvider: jest.fn(),
});

const mockJwt = () => ({
  sign: jest.fn(),
  verify: jest.fn(),
});

const mockMail = () => ({
  sendOtpCode: jest.fn().mockResolvedValue(undefined),
});

describe('AuthService', () => {
  let service: AuthService;
  let module: TestingModule;
  let redis: ReturnType<typeof mockRedis>;
  let usersService: ReturnType<typeof mockUsersService>;
  let jwt: ReturnType<typeof mockJwt>;
  let mail: ReturnType<typeof mockMail>;

  beforeEach(async () => {
    redis = mockRedis();
    usersService = mockUsersService();
    jwt = mockJwt();
    mail = mockMail();

    const usersClient = { getService: jest.fn().mockReturnValue(usersService) };

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'REDIS_CLIENT', useValue: redis },
        { provide: USERS_SERVICE, useValue: usersClient },
        { provide: JwtService, useValue: jwt },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get(AuthService);
    service.onModuleInit();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await module.close();
  });

  describe('sendAuthCode',()=>{
    it('sends a 7 digit auth code and stores it for the meail', async ()=>{
      jest.spyOn(Math, 'random').mockReturnValue(0)

      const result = await service.sendAuthCode('a@b.com')
      expect(redis.set).toHaveBeenCalledTimes(1)
      expect(redis.set).toHaveBeenCalledWith("auth:code:a@b.com", '1000000', "EX", OTP_TTL_SECONDS )
      expect(result).toEqual({message: 'Код отправлен на почту', success: true})
    })
  })

  describe('verifyAuthCode', () => {
    it('throws when no code is stored in redis', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.verifyAuthCode('a@b.com', '1234567')).rejects.toThrow(RpcException);
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('throws when stored code does not match provided one', async () => {
      redis.get.mockResolvedValue('1111111');

      await expect(service.verifyAuthCode('a@b.com', '2222222')).rejects.toThrow(RpcException);
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('deletes code, returns tokens for existing user', async () => {
      const user = makeUser();
      redis.get.mockResolvedValue('123');
      usersService.findByEmail.mockReturnValue(of(user));
      jwt.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh');

      const res = await service.verifyAuthCode('test@example.com', '123');

      expect(redis.del).toHaveBeenCalledWith('auth:code:test@example.com');
      expect(usersService.create).not.toHaveBeenCalled();
      expect(res).toEqual({ accessToken: 'access', refreshToken: 'refresh', user });
    });

    it('creates a user when findByEmail returns nothing', async () => {
      const created = makeUser({ id: 'new-user' });
      redis.get.mockResolvedValue('123');
      usersService.findByEmail.mockReturnValue(of(null));
      usersService.create.mockReturnValue(of(created));
      jwt.sign.mockReturnValue('tok');

      const res = await service.verifyAuthCode('new@x.com', '123');

      expect(usersService.create).toHaveBeenCalledWith({ email: 'new@x.com' });
      expect(res.user).toBe(created);
    });

    it('throws when user is blocked', async () => {
      redis.get.mockResolvedValue('123');
      usersService.findByEmail.mockReturnValue(of(makeUser({ isBlocked: true })));

      await expect(service.verifyAuthCode('test@example.com', '123')).rejects.toThrow(RpcException);
    });
  });

  

  describe('oAuthLogin', () => {
    beforeEach(() => {
      jwt.sign.mockReturnValue('tok');
    });

    it('returns tokens for user found by providerId (skips email lookup)', async () => {
      const user = makeUser({ name: 'Existing', avatar: 'existing.png', googleId: 'g-1' });
      usersService.findByProviderId.mockReturnValue(of(user));

      const res = await service.oAuthLogin('e@x.com', 'N', 'A', 'google', 'g-1');

      expect(usersService.findByProviderId).toHaveBeenCalledWith({ provider: 'google', providerId: 'g-1' });
      expect(usersService.findByEmail).not.toHaveBeenCalled();
      expect(usersService.create).not.toHaveBeenCalled();
      expect(usersService.updateProfile).not.toHaveBeenCalled();
      expect(usersService.linkProvider).not.toHaveBeenCalled();
      expect(res.user).toBe(user);
    });

    it('falls back to findByEmail when providerId lookup returns nothing', async () => {
      const user = makeUser({ name: 'Existing', avatar: 'existing.png', googleId: 'g-1' });
      usersService.findByProviderId.mockReturnValue(of(null));
      usersService.findByEmail.mockReturnValue(of(user));

      const res = await service.oAuthLogin('test@example.com', 'Existing', 'existing.png', 'google', 'g-1');

      expect(usersService.findByEmail).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(usersService.create).not.toHaveBeenCalled();
      expect(usersService.updateProfile).not.toHaveBeenCalled();
      expect(usersService.linkProvider).not.toHaveBeenCalled();
      expect(res.user.id).toBe(user.id);
    });

    it('creates a new user when neither provider nor email lookup yields a user', async () => {
      const created = makeUser({ id: 'fresh', name: null, avatar: null });
      usersService.findByProviderId.mockReturnValue(of(null));
      usersService.findByEmail.mockReturnValue(of(null));
      usersService.create.mockReturnValue(of(created));
      usersService.updateProfile.mockReturnValue(of({ ...created, name: 'N', avatar: 'A.png' }));
      usersService.linkProvider.mockReturnValue(of({ ...created, name: 'N', avatar: 'A.png', googleId: 'g-1' }));

      const res = await service.oAuthLogin('fresh@x.com', 'N', 'A.png', 'google', 'g-1');

      expect(usersService.create).toHaveBeenCalledWith({ email: 'fresh@x.com' });
      expect(usersService.updateProfile).toHaveBeenCalledWith({ id: 'fresh', name: 'N', avatar: 'A.png' });
      expect(usersService.linkProvider).toHaveBeenCalledWith({ id: 'fresh', provider: 'google', providerId: 'g-1' });
      expect(res.user.googleId).toBe('g-1');
    });

    it('updates only missing fields (name absent, avatar already present)', async () => {
      const user = makeUser({ name: null, avatar: 'existing.png' });
      usersService.findByProviderId.mockReturnValue(of(null));
      usersService.findByEmail.mockReturnValue(of(user));
      usersService.updateProfile.mockReturnValue(of({ ...user, name: 'Pulled' }));

      await service.oAuthLogin('test@example.com', 'Pulled', 'new.png', undefined, undefined);

      expect(usersService.updateProfile).toHaveBeenCalledWith({ id: user.id, name: 'Pulled' });
    });

    it('links github provider when githubId is missing', async () => {
      const user = makeUser({ name: 'X', avatar: 'X', githubId: null });
      usersService.findByProviderId.mockReturnValue(of(null));
      usersService.findByEmail.mockReturnValue(of(user));
      usersService.linkProvider.mockReturnValue(of({ ...user, githubId: 'gh-1' }));

      const res = await service.oAuthLogin('test@example.com', 'X', 'X', 'github', 'gh-1');

      expect(usersService.linkProvider).toHaveBeenCalledWith({ id: user.id, provider: 'github', providerId: 'gh-1' });
      expect(res.user.githubId).toBe('gh-1');
    });

    it('does not call linkProvider if user already has the provider linked', async () => {
      const user = makeUser({ name: 'X', avatar: 'X', googleId: 'g-1' });
      usersService.findByProviderId.mockReturnValue(of(user));

      await service.oAuthLogin('e@x.com', 'X', 'X', 'google', 'g-1');

      expect(usersService.linkProvider).not.toHaveBeenCalled();
    });

    it('throws when user is blocked', async () => {
      const blocked = makeUser({ isBlocked: true, name: 'X', avatar: 'X', googleId: 'g-1' });
      usersService.findByProviderId.mockReturnValue(of(blocked));

      await expect(service.oAuthLogin('e@x.com', 'X', 'X', 'google', 'g-1')).rejects.toThrow(RpcException);
    });
  });

  describe('refreshAccessToken', () => {
    it('throws when JWT verification fails', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('bad'); });

      await expect(service.refreshAccessToken('bad-token')).rejects.toThrow(RpcException);
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('throws when no refresh token is stored in redis', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', email: 'e', role: Role.USER });
      redis.get.mockResolvedValue(null);

      await expect(service.refreshAccessToken('rt')).rejects.toThrow(RpcException);
    });

    it('throws when stored refresh token does not match the supplied one', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', email: 'e', role: Role.USER });
      redis.get.mockResolvedValue('other-token');

      await expect(service.refreshAccessToken('rt')).rejects.toThrow(RpcException);
    });

    it('throws when user is not found', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', email: 'e', role: Role.USER });
      redis.get.mockResolvedValue('rt');
      usersService.findById.mockReturnValue(of(null));

      await expect(service.refreshAccessToken('rt')).rejects.toThrow(RpcException);
    });

    it('throws when user is blocked', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', email: 'e', role: Role.USER });
      redis.get.mockResolvedValue('rt');
      usersService.findById.mockReturnValue(of(makeUser({ isBlocked: true })));

      await expect(service.refreshAccessToken('rt')).rejects.toThrow(RpcException);
    });

    it('returns a fresh pair of tokens on success', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', email: 'test@example.com', role: Role.USER });
      redis.get.mockResolvedValue('rt');
      usersService.findById.mockReturnValue(of(makeUser()));
      jwt.sign.mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh');

      const res = await service.refreshAccessToken('rt');

      expect(res).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
      expect(redis.set).toHaveBeenCalledWith('refresh:user-1', 'new-refresh', 'EX', REFRESH_TTL_SECONDS);
    });
  });

  describe('logout', () => {
    it('deletes the refresh token from redis on a valid jwt', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1' });

      const res = await service.logout('rt');

      expect(redis.del).toHaveBeenCalledWith('refresh:user-1');
      expect(res).toEqual({ message: 'Выход выполнен успешно', success: true });
    });

    it('still succeeds when jwt verification throws (idempotent logout)', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('bad'); });

      const res = await service.logout('bad');

      expect(redis.del).not.toHaveBeenCalled();
      expect(res).toEqual({ message: 'Выход выполнен успешно', success: true });
    });
  });

  describe('validateUser', () => {
    it('returns valid=true with user when user exists and is not blocked', async () => {
      const user = makeUser();
      usersService.findById.mockReturnValue(of(user));

      await expect(service.validateUser('user-1')).resolves.toEqual({ valid: true, user });
    });

    it('returns valid=false when user does not exist', async () => {
      usersService.findById.mockReturnValue(of(null));

      await expect(service.validateUser('missing')).resolves.toEqual({ valid: false, user: null });
    });

    it('returns valid=false when user is blocked', async () => {
      usersService.findById.mockReturnValue(of(makeUser({ isBlocked: true })));

      await expect(service.validateUser('user-1')).resolves.toEqual({ valid: false, user: null });
    });

    it('swallows downstream errors and returns invalid', async () => {
      usersService.findById.mockReturnValue(throwError(() => new Error('grpc down')));

      await expect(service.validateUser('user-1')).resolves.toEqual({ valid: false, user: null });
    });
  });

  describe('generateTokens (indirect)', () => {
    it('signs access and refresh tokens with right payload and stores refresh in redis', async () => {
      const user = makeUser({ id: 'u-42', email: 'x@y.z', role: Role.ADMIN });
      redis.get.mockResolvedValue('123');
      usersService.findByEmail.mockReturnValue(of(user));
      jwt.sign.mockReturnValueOnce('acc').mockReturnValueOnce('ref');

      await service.verifyAuthCode('x@y.z', '123');

      const payload = { sub: 'u-42', email: 'x@y.z', role: Role.ADMIN };
      expect(jwt.sign).toHaveBeenNthCalledWith(1, payload, { secret: JWT_SECRET, expiresIn: JWT_ACCESS_EXPIRES });
      expect(jwt.sign).toHaveBeenNthCalledWith(2, payload, { secret: JWT_SECRET, expiresIn: JWT_REFRESH_EXPIRES });
      expect(redis.set).toHaveBeenCalledWith('refresh:u-42', 'ref', 'EX', REFRESH_TTL_SECONDS);
    });
  });
});
