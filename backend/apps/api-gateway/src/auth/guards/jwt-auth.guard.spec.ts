import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { of, throwError } from 'rxjs';
import { AUTH_SERVICE } from '@app/common';
import { JwtAuthGuard } from './jwt-auth.guard';

const mockAuth = () => ({
  validateUser: jest.fn(),
  refreshToken: jest.fn(),
});

const mockJwt = () => ({
  verify: jest.fn(),
});

const makeContext = (cookies: Record<string, string | undefined>) => {
  const req: Record<string, unknown> = { cookies };
  const res = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
  return { ctx, req, res };
};

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let module: TestingModule;
  let auth: ReturnType<typeof mockAuth>;
  let jwt: ReturnType<typeof mockJwt>;

  beforeEach(async () => {
    auth = mockAuth();
    jwt = mockJwt();

    const authClient = { getService: jest.fn().mockReturnValue(auth) };

    module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: AUTH_SERVICE, useValue: authClient },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    guard = module.get(JwtAuthGuard);
    guard.onModuleInit();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await module.close();
  });

  it('throws when both access and refresh cookies are missing', async () => {
    const { ctx } = makeContext({});

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(auth.validateUser).not.toHaveBeenCalled();
  });

  it('attaches user to request and returns true on valid access token', async () => {
    const user = { id: 'user-1', email: 'u@x.com', role: 'USER' };
    const { ctx, req } = makeContext({ accessToken: 'access' });
    jwt.verify.mockReturnValue({ sub: 'user-1' });
    auth.validateUser.mockReturnValue(of({ valid: true, user }));

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(auth.validateUser).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(req['user']).toBe(user);
  });

  it('refreshes tokens, sets cookies and returns true when access is expired but refresh is valid', async () => {
    const user = { id: 'user-1', email: 'u@x.com', role: 'USER' };
    const { ctx, req, res } = makeContext({ accessToken: 'expired', refreshToken: 'good-rt' });
    jwt.verify
      .mockImplementationOnce(() => { throw new Error('expired'); })
      .mockReturnValueOnce({ sub: 'user-1' });
    auth.refreshToken.mockReturnValue(of({ accessToken: 'new-access', refreshToken: 'new-refresh' }));
    auth.validateUser.mockReturnValue(of({ valid: true, user }));

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(res.cookie).toHaveBeenCalledWith('accessToken', 'new-access', expect.objectContaining({ httpOnly: true }));
    expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'new-refresh', expect.objectContaining({ httpOnly: true }));
    expect(req['user']).toBe(user);
  });

  it('clears cookies and throws when refresh fails with a normal error', async () => {
    const { ctx, res } = makeContext({ refreshToken: 'bad-rt' });
    auth.refreshToken.mockReturnValue(throwError(() => ({ code: 16, message: 'invalid refresh' })));

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(res.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
  });

  it('keeps cookies intact when refresh fails because the auth service is unavailable (gRPC code 14)', async () => {
    const { ctx, res } = makeContext({ refreshToken: 'rt' });
    auth.refreshToken.mockReturnValue(throwError(() => ({ code: 14, message: 'service unavailable' })));

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it('keeps cookies intact on ECONNREFUSED', async () => {
    const { ctx, res } = makeContext({ refreshToken: 'rt' });
    auth.refreshToken.mockReturnValue(throwError(() => ({ message: 'ECONNREFUSED 127.0.0.1' })));

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(res.clearCookie).not.toHaveBeenCalled();
  });

  it('throws "Невалидный токен" when access token is malformed and no refresh is provided', async () => {
    const { ctx } = makeContext({ accessToken: 'garbage' });
    jwt.verify.mockImplementation(() => { throw new Error('bad'); });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(auth.refreshToken).not.toHaveBeenCalled();
  });

  it('falls through to refresh path when access is valid but validateUser says invalid', async () => {
    const user = { id: 'user-1', email: 'u@x.com', role: 'USER' };
    const { ctx, req } = makeContext({ accessToken: 'access', refreshToken: 'rt' });
    jwt.verify
      .mockReturnValueOnce({ sub: 'user-1' })       // access valid
      .mockReturnValueOnce({ sub: 'user-1' });      // post-refresh access valid
    auth.validateUser
      .mockReturnValueOnce(of({ valid: false, user: null })) // first check rejects
      .mockReturnValueOnce(of({ valid: true, user }));        // after refresh accepts
    auth.refreshToken.mockReturnValue(of({ accessToken: 'new-a', refreshToken: 'new-r' }));

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req['user']).toBe(user);
  });
});
