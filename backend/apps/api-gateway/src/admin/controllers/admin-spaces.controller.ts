import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import {
  BOARDS_SERVICE,
  IBoardsService,
  USERS_SERVICE,
  IUsersService,
  UserPayload,
  Role,
} from '@app/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Admin — Spaces')
@ApiCookieAuth('accessToken')
@Controller('admin/spaces')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminSpacesController implements OnModuleInit {
  private boardsService: IBoardsService;
  private usersService: IUsersService;

  constructor(
    @Inject(BOARDS_SERVICE) private readonly boardsClient: ClientGrpc,
    @Inject(USERS_SERVICE)  private readonly usersClient:  ClientGrpc,
  ) {}

  onModuleInit() {
    this.boardsService = this.boardsClient.getService<IBoardsService>('BoardsService');
    this.usersService  = this.usersClient.getService<IUsersService>('UsersService');
  }

  // GET /admin/spaces 
  @Get()
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: '[MANAGER+] Все пространства с пагинацией и поиском' })
  @ApiQuery({ name: 'page',   required: false, description: 'Страница (default: 1)' })
  @ApiQuery({ name: 'limit',  required: false, description: 'Записей на странице (default: 20)' })
  @ApiQuery({ name: 'search',   required: false, description: 'Поиск по названию' })
  @ApiQuery({ name: 'memberId', required: false, description: 'Фильтр: только пространства, где пользователь участник' })
  @ApiResponse({ status: 200, description: 'Список всех пространств с кол-вом участников' })
  async getAllSpaces(
    @Query('page')     page     = '1',
    @Query('limit')    limit    = '20',
    @Query('search')   search   = '',
    @Query('memberId') memberId = '',
  ) {
    const res = await firstValueFrom(
      this.boardsService.adminGetSpaces({
        page:     +page,
        limit:    +limit,
        search:   search   || undefined,
        memberId: memberId || undefined,
      }),
    );
    return { ...res, spaces: res.spaces ?? [] };
  }

  // GET /admin/spaces/:id/members
  @Get(':id/members')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: '[MANAGER+] Участники пространства (без проверки членства)' })
  @ApiParam({ name: 'id', description: 'ID пространства' })
  @ApiResponse({ status: 200, description: 'Участники пространства с данными пользователей' })
  async getSpaceMembers(@Param('id') id: string) {
    const res = await firstValueFrom(
      this.boardsService.adminGetSpaceMembers({ spaceId: id }),
    );
    const members = res.members ?? [];
    if (!members.length) return [];

    const ids = [...new Set(members.map((m) => m.userId).filter(Boolean))];
    const { users } = await firstValueFrom(this.usersService.findManyByIds({ ids }));
    const usersMap = new Map((users ?? []).map((u) => [u.id, u]));

    return members.map((m) => {
      const u = usersMap.get(m.userId);
      return {
        ...m,
        user: u
          ? { id: u.id, name: u.name ?? '', email: u.email, avatar: u.avatar ?? null }
          : null,
      };
    });
  }

  // DELETE /admin/spaces/:id
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN+] Удалить любое пространство без проверки владельца' })
  @ApiParam({ name: 'id', description: 'ID пространства' })
  @ApiResponse({ status: 200, description: 'Пространство удалено' })
  async deleteSpace(@Req() req: Request, @Param('id') id: string) {
    const actor = (req as unknown as { user: UserPayload }).user;
    const result = await firstValueFrom(this.boardsService.adminDeleteSpace({ id }));
    firstValueFrom(this.usersService.createAuditLog({
      actorId:    actor.id,
      actorEmail: actor.email,
      action:     'SPACE_DELETED',
      targetId:   id,
      targetType: 'space',
    })).catch(() => {});
    return result;
  }
}
