import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  OnModuleInit,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import {
  USERS_SERVICE,
  IUsersService,
  BOARDS_SERVICE,
  IBoardsService,
  UserPayload,
  Role,
} from '@app/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, ROLE_HIERARCHY } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UpdateRoleDto } from '../../users/dto/update-role.dto';
import { BlockUserDto } from '../../users/dto/block-user.dto';

@ApiTags('Admin — Users')
@ApiCookieAuth('accessToken')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUsersController implements OnModuleInit {
  private usersService: IUsersService;
  private boardsService: IBoardsService;

  constructor(
    @Inject(USERS_SERVICE)  private readonly usersClient:  ClientGrpc,
    @Inject(BOARDS_SERVICE) private readonly boardsClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.usersService  = this.usersClient.getService<IUsersService>('UsersService');
    this.boardsService = this.boardsClient.getService<IBoardsService>('BoardsService');
  }

  // GET /admin/users
  @Get()
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: '[MANAGER+] Список пользователей с пагинацией и фильтрами' })
  @ApiQuery({ name: 'page',   required: false, description: 'Страница (default: 1)' })
  @ApiQuery({ name: 'limit',  required: false, description: 'Записей на странице (default: 20)' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по email / имени' })
  @ApiQuery({ name: 'role',   required: false, enum: Role, description: 'Фильтр по роли' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'blocked'], description: 'Фильтр по статусу' })
  @ApiResponse({ status: 200, description: 'Список пользователей' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async getAllUsers(
    @Query('page')   page   = '1',
    @Query('limit')  limit  = '20',
    @Query('search') search = '',
    @Query('role')   role   = '',
    @Query('status') status = '',
  ) {
    const res = await firstValueFrom(
      this.usersService.findAll({
        page:   +page,
        limit:  +limit,
        search: search || undefined,
        role:   role   || undefined,
        status: (status as 'active' | 'blocked') || undefined,
      }),
    );
    return {
      users:      res.users ?? [],
      total:      res.total      ?? 0,
      page:       res.page       ?? 1,
      totalPages: res.totalPages ?? 1,
    };
  }

  // GET /admin/users/:id/activity 
  @Get(':id/activity')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: '[MANAGER+] Профиль + статистика пользователя' })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль и активность' })
  async getUserActivity(@Param('id') id: string) {
    const [user, boardStats] = await Promise.all([
      firstValueFrom(this.usersService.findById({ id })),
      firstValueFrom(this.boardsService.getUserBoardStats({ userId: id })),
    ]);
    return {
      user: {
        id:        user.id,
        email:     user.email,
        name:      user.name,
        avatar:    user.avatar,
        role:      user.role,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
      },
      stats: {
        boardsCreated: boardStats.boardsCreated,
        spacesCount:   boardStats.spacesCount,
        memberSince:   user.createdAt,
      },
    };
  }

  // PATCH /admin/users/:id/role 
  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN+] Изменить роль пользователя' })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiResponse({ status: 200, description: 'Обновлённые данные пользователя' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async updateUserRole(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<UserPayload> {
    const actor: UserPayload = req['user'];

    if (actor.id === id) throw new ForbiddenException('Нельзя изменить собственную роль');

    const target = await firstValueFrom(this.usersService.findById({ id }));

    const actorLevel        = ROLE_HIERARCHY[actor.role as Role] ?? 0;
    const targetCurrentLevel = ROLE_HIERARCHY[target.role as Role] ?? 0;
    const targetNewLevel     = ROLE_HIERARCHY[dto.role] ?? 0;

    if (actor.role !== Role.SUPER_ADMIN) {
      if (targetCurrentLevel >= actorLevel) {
        throw new ForbiddenException('Недостаточно прав для изменения роли этого пользователя');
      }
      if (targetNewLevel >= actorLevel) {
        throw new ForbiddenException('Нельзя назначить роль выше или равную своей');
      }
    }

    const result = await firstValueFrom(this.usersService.updateRole({ id, role: dto.role }));
    firstValueFrom(this.usersService.createAuditLog({
      actorId:    actor.id,
      actorEmail: actor.email,
      action:     'USER_ROLE_CHANGED',
      targetId:   id,
      targetType: 'user',
      details:    JSON.stringify({ newRole: dto.role }),
    })).catch(() => {});
    return result;
  }

  // PATCH /admin/users/:id/block 
  @Patch(':id/block')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN+] Заблокировать / разблокировать пользователя' })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiResponse({ status: 200, description: 'Обновлённые данные пользователя' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async blockUser(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: BlockUserDto,
  ): Promise<UserPayload> {
    const actor: UserPayload = req['user'];

    if (actor.id === id) throw new ForbiddenException('Нельзя заблокировать самого себя');

    const actorLevel  = ROLE_HIERARCHY[actor.role as Role] ?? 0;
    const target      = await firstValueFrom(this.usersService.findById({ id }));
    const targetLevel = ROLE_HIERARCHY[target.role as Role] ?? 0;

    if (actor.role !== Role.SUPER_ADMIN && targetLevel >= actorLevel) {
      throw new ForbiddenException('Недостаточно прав для блокировки этого пользователя');
    }

    const result = await firstValueFrom(
      this.usersService.blockUser({ id, isBlocked: dto.isBlocked }),
    );
    firstValueFrom(this.usersService.createAuditLog({
      actorId:    actor.id,
      actorEmail: actor.email,
      action:     dto.isBlocked ? 'USER_BLOCKED' : 'USER_UNBLOCKED',
      targetId:   id,
      targetType: 'user',
    })).catch(() => {});
    return result;
  }

  // DELETE /admin/users/:id 
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN+] Удалить пользователя' })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiResponse({ status: 200, description: 'Пользователь удалён' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async deleteUser(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const actor: UserPayload = req['user'];

    if (actor.id === id) throw new ForbiddenException('Нельзя удалить самого себя');

    const actorLevel  = ROLE_HIERARCHY[actor.role as Role] ?? 0;
    const target      = await firstValueFrom(this.usersService.findById({ id }));
    const targetLevel = ROLE_HIERARCHY[target.role as Role] ?? 0;

    if (actor.role !== Role.SUPER_ADMIN && targetLevel >= actorLevel) {
      throw new ForbiddenException('Недостаточно прав для удаления этого пользователя');
    }

    const result = await firstValueFrom(this.usersService.deleteUser({ id }));
    firstValueFrom(this.usersService.createAuditLog({
      actorId:    actor.id,
      actorEmail: actor.email,
      action:     'USER_DELETED',
      targetId:   id,
      targetType: 'user',
      details:    JSON.stringify({ deletedEmail: target.email }),
    })).catch(() => {});
    return result;
  }
}
