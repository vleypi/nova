import { SetMetadata } from '@nestjs/common';
import { Role } from '@app/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
