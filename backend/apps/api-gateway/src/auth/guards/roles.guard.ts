import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, UserPayload } from '@app/common';
import { ROLES_KEY } from '../decorators/roles.decorator';

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 4,
  [Role.ADMIN]:       3,
  [Role.MANAGER]:     2,
  [Role.USER]:        1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: UserPayload = request['user'];

    if (!user) throw new ForbiddenException('Пользователь не авторизован');

    const userLevel = ROLE_HIERARCHY[user.role as Role] ?? 0;
    const minRequired = Math.min(...requiredRoles.map(r => ROLE_HIERARCHY[r] ?? 99));

    if (userLevel < minRequired) {
      throw new ForbiddenException('Недостаточно прав для выполнения операции');
    }

    return true;
  }
}
