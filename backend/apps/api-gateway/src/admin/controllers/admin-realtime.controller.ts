import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
} from '@nestjs/swagger';
import {
  USERS_SERVICE,
  IUsersService,
  UserPayload,
  COLLAB_INTERNAL_URL,
  INTERNAL_API_KEY,
  Role,
} from '@app/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Admin — Realtime')
@ApiCookieAuth('accessToken')
@Controller('admin/realtime')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminRealtimeController implements OnModuleInit {
  private usersService: IUsersService;

  constructor(@Inject(USERS_SERVICE) private readonly usersClient: ClientGrpc) {}

  onModuleInit() {
    this.usersService = this.usersClient.getService<IUsersService>('UsersService');
  }

  // GET /admin/realtime/boards 
  @Get('boards')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: '[MANAGER+] Доски с онлайн-пользователями прямо сейчас' })
  @ApiResponse({ status: 200, description: 'Список активных досок с участниками' })
  async getOnlineBoards() {
    try {
      const res = await fetch(`${COLLAB_INTERNAL_URL}/online`, {
        headers: { 'x-api-key': INTERNAL_API_KEY },
      });
      return res.json();
    } catch {
      return { totalOnlineUsers: 0, totalOnlineBoards: 0, boards: [] };
    }
  }

  // POST /admin/realtime/disconnect/:userId
  @Post('disconnect/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN+] Принудительно отключить пользователя от WebSocket' })
  @ApiParam({ name: 'userId', description: 'ID пользователя' })
  @ApiResponse({ status: 201, description: 'Пользователь отключён' })
  async disconnectUser(@Req() req: Request, @Param('userId') userId: string) {
    const actor = (req as unknown as { user: UserPayload }).user;
    const res = await fetch(`${COLLAB_INTERNAL_URL}/disconnect/${userId}`, {
      method:  'POST',
      headers: { 'x-api-key': INTERNAL_API_KEY },
    });
    const data = await res.json();
    firstValueFrom(this.usersService.createAuditLog({
      actorId:    actor.id,
      actorEmail: actor.email,
      action:     'USER_DISCONNECTED',
      targetId:   userId,
      targetType: 'user',
    })).catch(() => {});
    return data;
  }

  // POST /admin/realtime/broadcast
  @Post('broadcast')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: '[SUPER_ADMIN] Отправить системное сообщение всем онлайн-пользователям' })
  @ApiResponse({ status: 201, description: 'Сообщение отправлено' })
  async broadcast(
    @Req() req: Request,
    @Body() body: { message: string; type?: 'info' | 'warning' | 'maintenance' },
  ) {
    const actor = (req as unknown as { user: UserPayload }).user;
    const res = await fetch(`${COLLAB_INTERNAL_URL}/broadcast`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': INTERNAL_API_KEY },
      body:    JSON.stringify(body),
    });
    firstValueFrom(this.usersService.createAuditLog({
      actorId:    actor.id,
      actorEmail: actor.email,
      action:     'SYSTEM_BROADCAST',
      details:    JSON.stringify(body),
    })).catch(() => {});
    return res.json();
  }
}
