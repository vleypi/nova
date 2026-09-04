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
  ApiParam,
  ApiQuery,
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

@ApiTags('Admin — Boards')
@ApiCookieAuth('accessToken')
@Controller('admin/boards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminBoardsController implements OnModuleInit {
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

  // GET /admin/boards 
  @Get()
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: '[MANAGER+] Все доски с пагинацией и поиском' })
  @ApiQuery({ name: 'page',   required: false, description: 'Страница (default: 1)' })
  @ApiQuery({ name: 'limit',  required: false, description: 'Записей на странице (default: 20)' })
  @ApiQuery({ name: 'search',    required: false, description: 'Поиск по названию' })
  @ApiQuery({ name: 'createdBy', required: false, description: 'Фильтр по ID автора доски' })
  @ApiQuery({ name: 'privacy',   required: false, enum: ['public', 'private'], description: 'Фильтр по приватности' })
  @ApiQuery({ name: 'spaceId',   required: false, description: 'Фильтр по ID родительского пространства' })
  @ApiResponse({ status: 200, description: 'Список всех досок с данными создателей' })
  async getAllBoards(
    @Query('page')      page      = '1',
    @Query('limit')     limit     = '20',
    @Query('search')    search    = '',
    @Query('createdBy') createdBy = '',
    @Query('privacy')   privacy   = '',
    @Query('spaceId')   spaceId   = '',
  ) {
    const res = await firstValueFrom(
      this.boardsService.adminGetBoards({
        page:      +page,
        limit:     +limit,
        search:    search    || undefined,
        createdBy: createdBy || undefined,
        privacy:   (privacy as 'public' | 'private') || undefined,
        spaceId:   spaceId   || undefined,
      }),
    );

    const boards = res.boards ?? [];

    const ids = [...new Set(boards.map((b) => b.createdBy).filter(Boolean))];
    const { users } = ids.length
      ? await firstValueFrom(this.usersService.findManyByIds({ ids }))
      : { users: [] };
    const usersMap = new Map((users ?? []).map((u) => [u.id, u]));

    return {
      ...res,
      boards: boards.map((b) => {
        const creator = usersMap.get(b.createdBy);
        return {
          ...b,
          createdByUser: creator
            ? { id: creator.id, name: creator.name, avatar: creator.avatar }
            : null,
        };
      }),
    };
  }

  // DELETE /admin/boards/:id 
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN+] Удалить любую доску без проверки владельца' })
  @ApiParam({ name: 'id', description: 'ID доски' })
  @ApiResponse({ status: 200, description: 'Доска удалена' })
  async deleteBoard(@Req() req: Request, @Param('id') id: string) {
    const actor = (req as unknown as { user: UserPayload }).user;
    const result = await firstValueFrom(this.boardsService.adminDeleteBoard({ id }));
    firstValueFrom(this.usersService.createAuditLog({
      actorId:    actor.id,
      actorEmail: actor.email,
      action:     'BOARD_DELETED',
      targetId:   id,
      targetType: 'board',
    })).catch(() => {});
    return result;
  }
}
