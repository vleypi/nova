import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  OnModuleInit,
  Inject,
  ConflictException,
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
  IUsersService,
  UserPayload,
  USERS_SERVICE,
  BoardPayload,
  MemberPayload,
} from '@app/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { MoveBoardDto } from './dto/move-board.dto';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { UpdateMemberPermissionsDto } from './dto/update-member-permissions.dto';
import { BoardResponseDto } from './dto/board-response.dto';

@ApiTags('Boards & Spaces')
@ApiCookieAuth('accessToken')
@Controller()
@UseGuards(JwtAuthGuard)
export class BoardsController implements OnModuleInit {
  private boardsService: IBoardsService;
  private usersService: IUsersService;

  constructor(
    @Inject(BOARDS_SERVICE) private readonly boardsClient: ClientGrpc,
    @Inject(USERS_SERVICE) private readonly usersClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.boardsService = this.boardsClient.getService<IBoardsService>('BoardsService');
    this.usersService  = this.usersClient.getService<IUsersService>('UsersService');
  }

  private async enrichMembers(members: MemberPayload[]) {
    if (!members.length) return members;
    const ids = [...new Set(members.map((m) => m.userId).filter(Boolean))];
    const { users } = await firstValueFrom(
      this.usersService.findManyByIds({ ids }),
    );
    const usersMap = new Map(users.map((u) => [u.id, u]));
    return members.map((m) => {
      const u = usersMap.get(m.userId);
      return {
        ...m,
        user: u ? { id: u.id, name: u.name ?? '', avatar: u.avatar ?? '' } : null,
      };
    });
  }

  private async enrichBoards(boards: BoardPayload[]) {
    if (!boards.length) return boards;
    const ids = [...new Set(boards.map((b) => b.createdBy).filter(Boolean))];
    const { users } = await firstValueFrom(
      this.usersService.findManyByIds({ ids }),
    );
    const usersMap = new Map(users.map((u) => [u.id, u]));
    return boards.map((b) => {
      const { createdBy, ...rest } = b;
      const creator = usersMap.get(createdBy);
      return {
        ...rest,
        createdByUser: creator
          ? { id: creator.id, name: creator.name, avatar: creator.avatar }
          : null,
      };
    });
  }

  // GET /boards?spaceId=xxx 
  @Get('boards')
  @ApiOperation({ summary: 'Получить список досок (опционально фильтр по spaceId)' })
  @ApiQuery({ name: 'spaceId', required: false, description: 'ID пространства' })
  @ApiResponse({ status: 200, description: 'Массив досок с данными создателя', type: [BoardResponseDto] })
  async getBoards(@Req() req: Request, @Query('spaceId') spaceId?: string) {
    const user: UserPayload = req['user'];
    const res = await firstValueFrom(
      this.boardsService.getBoards({ userId: user.id, spaceId }),
    );
    return this.enrichBoards(res.boards ?? []);
  }

  // GET /boards/favorites 
  @Get('boards/favorites')
  @ApiOperation({ summary: 'Получить избранные доски' })
  @ApiResponse({ status: 200, description: 'Массив избранных досок с данными создателя', type: [BoardResponseDto] })
  async getFavorites(@Req() req: Request) {
    const user: UserPayload = req['user'];
    const res = await firstValueFrom(
      this.boardsService.getFavorites({ userId: user.id }),
    );
    return this.enrichBoards(res.boards ?? []);
  }

  // GET /boards/:id 
  @Get('boards/:id')
  @ApiOperation({ summary: 'Получить доску по ID' })
  @ApiParam({ name: 'id', description: 'ID доски' })
  @ApiResponse({ status: 200, description: 'Данные доски с данными создателя', type: BoardResponseDto })
  @ApiResponse({ status: 404, description: 'Доска не найдена' })
  async getBoard(@Req() req: Request, @Param('id') id: string) {
    const user: UserPayload = req['user'];
    const board = await firstValueFrom(
      this.boardsService.getBoard({ id, userId: user.id }),
    );
    const [enriched] = await this.enrichBoards([board]);
    return enriched;
  }

  // POST /boards 
  @Post('boards')
  @ApiOperation({ summary: 'Создать новую доску' })
  @ApiResponse({ status: 201, description: 'Созданная доска' })
  async createBoard(@Req() req: Request, @Body() dto: CreateBoardDto) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.createBoard({
        name: dto.name || 'Untitled board',
        createdBy: user.id,
        spaceId: dto.spaceId,
      }),
    );
  }

  // PATCH /boards/:id 
  @Patch('boards/:id')
  @ApiOperation({ summary: 'Обновить доску' })
  @ApiParam({ name: 'id', description: 'ID доски' })
  @ApiResponse({ status: 200, description: 'Обновлённая доска' })
  async updateBoard(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateBoardDto,
  ) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.updateBoard({ id, userId: user.id, ...dto }),
    );
  }

  // DELETE /boards/:id 
  @Delete('boards/:id')
  @ApiOperation({ summary: 'Удалить доску' })
  @ApiParam({ name: 'id', description: 'ID доски' })
  @ApiResponse({ status: 200, description: 'Доска удалена' })
  async deleteBoard(@Req() req: Request, @Param('id') id: string) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.deleteBoard({ id, userId: user.id }),
    );
  }

  // POST /boards/:id/duplicate 
  @Post('boards/:id/duplicate')
  @ApiOperation({ summary: 'Дублировать доску' })
  @ApiParam({ name: 'id', description: 'ID доски' })
  @ApiResponse({ status: 201, description: 'Копия доски' })
  async duplicateBoard(@Req() req: Request, @Param('id') id: string) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.duplicateBoard({ id, userId: user.id }),
    );
  }

  // POST /boards/:id/favorite 
  @Post('boards/:id/favorite')
  @ApiOperation({ summary: 'Добавить / убрать доску из избранного' })
  @ApiParam({ name: 'id', description: 'ID доски' })
  @ApiResponse({ status: 201, description: 'Состояние избранного переключено' })
  async toggleFavorite(@Req() req: Request, @Param('id') id: string) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.toggleFavorite({ userId: user.id, boardId: id }),
    );
  }

  // GET /boards/:id/export
  @Get('boards/:id/export')
  @ApiOperation({ summary: 'Экспортировать доску (метаданные + все элементы)' })
  @ApiParam({ name: 'id', description: 'ID доски' })
  @ApiResponse({ status: 200, description: 'JSON с данными доски и элементами' })
  async exportBoard(@Req() req: Request, @Param('id') id: string) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.exportBoard({ id, userId: user.id }),
    );
  }

  // PATCH /boards/:id/move
  @Patch('boards/:id/move')
  @ApiOperation({ summary: 'Переместить доску в другое пространство' })
  @ApiParam({ name: 'id', description: 'ID доски' })
  @ApiResponse({ status: 200, description: 'Перемещённая доска' })
  async moveBoard(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: MoveBoardDto,
  ) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.moveBoard({ id, userId: user.id, targetSpaceId: dto.targetSpaceId }),
    );
  }


  // GET /spaces
  @Get('spaces')
  @ApiOperation({ summary: 'Получить пространства пользователя' })
  @ApiResponse({ status: 200, description: 'Массив пространств' })
  async getSpaces(@Req() req: Request) {
    const user: UserPayload = req['user'];
    const res = await firstValueFrom(
      this.boardsService.getSpaces({ userId: user.id }),
    );
    return res.spaces ?? [];
  }

  // GET /spaces/:id 
  @Get('spaces/:id')
  @ApiOperation({ summary: 'Получить пространство по ID' })
  @ApiParam({ name: 'id', description: 'ID пространства' })
  @ApiResponse({ status: 200, description: 'Данные пространства' })
  async getSpace(@Req() req: Request, @Param('id') id: string) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.getSpace({ id, userId: user.id }),
    );
  }

  // POST /spaces 
  @Post('spaces')
  @ApiOperation({ summary: 'Создать новое пространство' })
  @ApiResponse({ status: 201, description: 'Созданное пространство' })
  async createSpace(@Req() req: Request, @Body() dto: CreateSpaceDto) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.createSpace({ name: dto.name, ownerId: user.id }),
    );
  }

  // PATCH /spaces/:id 
  @Patch('spaces/:id')
  @ApiOperation({ summary: 'Обновить пространство' })
  @ApiParam({ name: 'id', description: 'ID пространства' })
  @ApiResponse({ status: 200, description: 'Обновлённое пространство' })
  async updateSpace(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateSpaceDto,
  ) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.updateSpace({ id, userId: user.id, name: dto.name }),
    );
  }

  // DELETE /spaces/:id 
  @Delete('spaces/:id')
  @ApiOperation({ summary: 'Удалить пространство' })
  @ApiParam({ name: 'id', description: 'ID пространства' })
  @ApiResponse({ status: 200, description: 'Пространство удалено' })
  async deleteSpace(@Req() req: Request, @Param('id') id: string) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.deleteSpace({ id, userId: user.id }),
    );
  }


  // GET /spaces/:id/members 
  @Get('spaces/:id/members')
  @ApiOperation({ summary: 'Получить участников пространства' })
  @ApiParam({ name: 'id', description: 'ID пространства' })
  @ApiResponse({ status: 200, description: 'Массив участников' })
  async getSpaceMembers(@Req() req: Request, @Param('id') id: string) {
    const user: UserPayload = req['user'];
    const res = await firstValueFrom(
      this.boardsService.getSpaceMembers({ spaceId: id, userId: user.id }),
    );
    return this.enrichMembers(res.members ?? []);
  }

  // POST /spaces/join/:code
  @Post('spaces/join/:code')
  @ApiOperation({ summary: 'Вступить в пространство по инвайт-коду' })
  @ApiParam({ name: 'code', description: 'Инвайт-код' })
  @ApiResponse({ status: 201, description: 'Вступил в пространство' })
  @ApiResponse({ status: 409, description: 'Уже участник, вернётся spaceId' })
  async joinByInvite(@Req() req: Request, @Param('code') code: string) {
    const user: UserPayload = req['user'];
    const { space, alreadyMember } = await firstValueFrom(
      this.boardsService.joinByInvite({ inviteCode: code, userId: user.id }),
    );

    // Уже участник — 409 с spaceId, чтобы фронт сделал redirect.
    if (alreadyMember) {
      throw new ConflictException({
        message: 'Вы уже участник этого пространства',
        spaceId: space.id,
      });
    }

    return space;
  }

  // POST /spaces/:id/leave 
  @Post('spaces/:id/leave')
  @ApiOperation({ summary: 'Покинуть пространство' })
  @ApiParam({ name: 'id', description: 'ID пространства' })
  @ApiResponse({ status: 201, description: 'Покинул пространство' })
  async leaveSpace(@Req() req: Request, @Param('id') id: string) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.leaveSpace({ spaceId: id, userId: user.id }),
    );
  }

  // DELETE /spaces/:id/members/:targetUserId 
  @Delete('spaces/:id/members/:targetUserId')
  @ApiOperation({ summary: 'Удалить участника из пространства' })
  @ApiParam({ name: 'id', description: 'ID пространства' })
  @ApiParam({ name: 'targetUserId', description: 'ID удаляемого пользователя' })
  @ApiResponse({ status: 200, description: 'Участник удалён' })
  async removeMember(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.removeMember({
        spaceId: id,
        userId: user.id,
        targetUserId,
      }),
    );
  }

  // PATCH /spaces/:id/members/:targetUserId/permissions 
  @Patch('spaces/:id/members/:targetUserId/permissions')
  @ApiOperation({ summary: 'Обновить права участника пространства' })
  @ApiParam({ name: 'id', description: 'ID пространства' })
  @ApiParam({ name: 'targetUserId', description: 'ID участника' })
  @ApiResponse({ status: 200, description: 'Права обновлены' })
  async updateMemberPermissions(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('targetUserId') targetUserId: string,
    @Body() dto: UpdateMemberPermissionsDto,
  ) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.updateMemberPermissions({
        spaceId: id,
        userId: user.id,
        targetUserId,
        ...dto,
      }),
    );
  }

  // POST /spaces/:id/transfer-ownership
  @Post('spaces/:id/transfer-ownership')
  @ApiOperation({ summary: 'Передать владение пространством другому участнику (только OWNER)' })
  @ApiParam({ name: 'id', description: 'ID пространства' })
  @ApiResponse({ status: 201, description: 'Владение передано: spaceId, newOwnerId, previousOwnerId' })
  async transferOwnership(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('targetUserId') targetUserId: string,
  ) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.transferOwnership({
        spaceId: id,
        userId: user.id,
        targetUserId,
      }),
    );
  }

  // POST /spaces/:id/regenerate-invite
  @Post('spaces/:id/regenerate-invite')
  @ApiOperation({ summary: 'Перегенерировать инвайт-код пространства' })
  @ApiParam({ name: 'id', description: 'ID пространства' })
  @ApiResponse({ status: 201, description: 'Новый инвайт-код' })
  async regenerateInviteCode(@Req() req: Request, @Param('id') id: string) {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.boardsService.regenerateInviteCode({
        spaceId: id,
        userId: user.id,
      }),
    );
  }
}
