import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@app/common';
import { RolesGuard } from './roles.guard';

const makeContext = (user: unknown): ExecutionContext => ({
  getHandler: () => null,
  getClass: () => null,
  switchToHttp: () => ({
    getRequest: () => ({ user }),
  }),
} as unknown as ExecutionContext);

const makeReflector = (roles: Role[] | undefined) => ({
  getAllAndOverride: jest.fn().mockReturnValue(roles),
}) as unknown as Reflector;

describe('RolesGuard', () => {
  it('lets the request through when the route has no @Roles metadata', () => {
    const guard = new RolesGuard(makeReflector(undefined));

    expect(guard.canActivate(makeContext({ role: Role.USER }))).toBe(true);
  });

  it('lets the request through when @Roles was called with an empty list', () => {
    const guard = new RolesGuard(makeReflector([]));

    expect(guard.canActivate(makeContext({ role: Role.USER }))).toBe(true);
  });

  it('throws ForbiddenException when no user is attached to the request', () => {
    const guard = new RolesGuard(makeReflector([Role.ADMIN]));

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when the user role is below the minimum required', () => {
    const guard = new RolesGuard(makeReflector([Role.ADMIN]));

    expect(() => guard.canActivate(makeContext({ role: Role.USER }))).toThrow(ForbiddenException);
  });

  it('passes when the user role equals the minimum required', () => {
    const guard = new RolesGuard(makeReflector([Role.ADMIN]));

    expect(guard.canActivate(makeContext({ role: Role.ADMIN }))).toBe(true);
  });

  it('passes when the user role is strictly above the minimum required', () => {
    const guard = new RolesGuard(makeReflector([Role.ADMIN]));

    expect(guard.canActivate(makeContext({ role: Role.SUPER_ADMIN }))).toBe(true);
  });

  it('treats multiple @Roles values as the MINIMUM required (most permissive)', () => {
    const guard = new RolesGuard(makeReflector([Role.ADMIN, Role.MANAGER]));

    expect(guard.canActivate(makeContext({ role: Role.MANAGER }))).toBe(true);
  });

  it('treats unknown role string as level 0 → access denied for any required role', () => {
    const guard = new RolesGuard(makeReflector([Role.USER]));

    expect(() => guard.canActivate(makeContext({ role: 'WIZARD' }))).toThrow(ForbiddenException);
  });
});
