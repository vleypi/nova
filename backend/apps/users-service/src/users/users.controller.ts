import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Role } from '@app/common';
import { UsersService } from './users.service';
import { AuditLogService } from './audit-log.service';
import { User } from './entities/user.entity';
import { AuditLog } from './entities/audit-log.entity';

const toResponse = (user: User) => ({
  id:        user.id,
  email:     user.email,
  name:      user.name  ?? '',
  avatar:    user.avatar ?? '',
  role:      user.role,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
  isBlocked: user.isBlocked,
  googleId:  user.googleId ?? '',
  githubId:  user.githubId ?? '',
});

const toAuditResponse = (log: AuditLog) => ({
  id:         log.id,
  actorId:    log.actorId,
  actorEmail: log.actorEmail,
  action:     log.action,
  targetId:   log.targetId   ?? '',
  targetType: log.targetType ?? '',
  details:    log.details    ?? '',
  createdAt:  log.createdAt.toISOString(),
});

@Controller()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @GrpcMethod('UsersService', 'FindById')
  async findById(data: { id: string }) {
    const user = await this.usersService.findById(data.id);
    return toResponse(user);
  }

  @GrpcMethod('UsersService', 'FindByEmail')
  async findByEmail(data: { email: string }) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) return { id: '', email: '', name: '', avatar: '', role: '', createdAt: '', updatedAt: '', isBlocked: false };
    return toResponse(user);
  }

  @GrpcMethod('UsersService', 'FindByProviderId')
  async findByProviderId(data: { provider: string; providerId: string }) {
    const user = await this.usersService.findByProviderId(data.provider, data.providerId);
    if (!user) return { id: '', email: '', name: '', avatar: '', role: '', createdAt: '', updatedAt: '', isBlocked: false };
    return toResponse(user);
  }

  @GrpcMethod('UsersService', 'Create')
  async create(data: { email: string }) {
    const user = await this.usersService.create(data.email);
    return toResponse(user);
  }

  @GrpcMethod('UsersService', 'UpdateProfile')
  async updateProfile(data: { id: string; name?: string; avatar?: string }) {
    const user = await this.usersService.updateProfile(data.id, {
      name:   data.name   || undefined,
      avatar: data.avatar || undefined,
    });
    return toResponse(user);
  }

  @GrpcMethod('UsersService', 'UpdateRole')
  async updateRole(data: { id: string; role: string }) {
    const user = await this.usersService.updateRole(data.id, data.role as Role);
    return toResponse(user);
  }

  @GrpcMethod('UsersService', 'FindAll')
  async findAll(data: {
    page?:   number;
    limit?:  number;
    search?: string;
    role?:   string;
    status?: 'active' | 'blocked' | '';
  }) {
    const res = await this.usersService.findAll({
      page:   data.page   || 1,
      limit:  data.limit  || 20,
      search: data.search || undefined,
      role:   data.role   || undefined,
      status: (data.status as 'active' | 'blocked') || undefined,
    });
    return {
      users:      res.users.map(toResponse),
      total:      res.total,
      page:       res.page,
      totalPages: res.totalPages,
    };
  }

  @GrpcMethod('UsersService', 'FindManyByIds')
  async findManyByIds(data: { ids: string[] }) {
    const users = await this.usersService.findManyByIds(data.ids ?? []);
    return { users: users.map(toResponse) };
  }

  @GrpcMethod('UsersService', 'BlockUser')
  async blockUser(data: { id: string; isBlocked: boolean }) {
    const user = await this.usersService.blockUser(data.id, data.isBlocked);
    return toResponse(user);
  }

  @GrpcMethod('UsersService', 'DeleteUser')
  async deleteUser(data: { id: string }) {
    await this.usersService.deleteUser(data.id);
    return { success: true };
  }

  @GrpcMethod('UsersService', 'LinkProvider')
  async linkProvider(data: { id: string; provider: string; providerId: string }) {
    const user = await this.usersService.linkProvider(data.id, data.provider, data.providerId);
    return toResponse(user);
  }

  @GrpcMethod('UsersService', 'UnlinkProvider')
  async unlinkProvider(data: { id: string; provider: string }) {
    const user = await this.usersService.unlinkProvider(data.id, data.provider);
    return toResponse(user);
  }

  @GrpcMethod('UsersService', 'GetStats')
  async getStats() {
    return this.usersService.getStats();
  }

  @GrpcMethod('UsersService', 'CreateAuditLog')
  async createAuditLog(data: {
    actorId: string; actorEmail: string; action: string;
    targetId?: string; targetType?: string; details?: string;
  }) {
    const log = await this.auditLogService.create(data);
    return toAuditResponse(log);
  }

  @GrpcMethod('UsersService', 'GetAuditLogs')
  async getAuditLogs(data: { page?: number; limit?: number; action?: string; actorId?: string; targetId?: string }) {
    const res = await this.auditLogService.findAll(
      data.page   || 1,
      data.limit  || 20,
      data.action   || undefined,
      data.actorId  || undefined,
      data.targetId || undefined,
    );
    return {
      logs:       res.logs.map(toAuditResponse),
      total:      res.total,
      page:       res.page,
      totalPages: res.totalPages,
    };
  }

  @GrpcMethod('UsersService', 'GetUsersTimeseries')
  async getUsersTimeseries(data: { months?: number; days?: number }) {
    const months = Math.max(1, Math.min(36, data.months || 6));
    const days   = Math.max(1, Math.min(730, data.days   || 182));
    const [usersMonthly, activity] = await Promise.all([
      this.usersService.getCreatedByMonth(months),
      this.auditLogService.getActivityByDay(days),
    ]);
    return {
      usersMonthly,
      activityDaily: activity.daily,
      activityTotal: activity.total,
    };
  }
}
