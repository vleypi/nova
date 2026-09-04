import {
  Controller,
  Get,
  UseGuards,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import {
  BOARDS_SERVICE,
  IBoardsService,
  USERS_SERVICE,
  IUsersService,
  AUTH_SERVICE,
  IAuthService,
  COLLAB_INTERNAL_URL,
  INTERNAL_API_KEY,
  Role,
} from '@app/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Admin — System')
@ApiCookieAuth('accessToken')
@Controller('admin/system')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminSystemController implements OnModuleInit {
  private usersService: IUsersService;
  private boardsService: IBoardsService;
  private authService: IAuthService;

  constructor(
    @Inject(USERS_SERVICE)  private readonly usersClient:  ClientGrpc,
    @Inject(BOARDS_SERVICE) private readonly boardsClient: ClientGrpc,
    @Inject(AUTH_SERVICE)   private readonly authClient:   ClientGrpc,
  ) {}

  onModuleInit() {
    this.usersService  = this.usersClient.getService<IUsersService>('UsersService');
    this.boardsService = this.boardsClient.getService<IBoardsService>('BoardsService');
    this.authService   = this.authClient.getService<IAuthService>('AuthService');
  }

  // GET /admin/system/health 
  @Get('health')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: '[MANAGER+] Статус всех микросервисов' })
  @ApiResponse({ status: 200, description: 'Состояние каждого сервиса' })
  async getHealth() {
    const check = async (name: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
        return { name, status: 'ok' };
      } catch {
        return { name, status: 'error' };
      }
    };

    const [users, boards, auth, collab] = await Promise.all([
      check('users-service',  () => firstValueFrom(this.usersService.getStats({}))),
      check('boards-service', () => firstValueFrom(this.boardsService.getBoardStats({}))),
      check('auth-service',   () => firstValueFrom(this.authService.ping({}))),
      check('collab-service', async () => {
        const res = await fetch(`${COLLAB_INTERNAL_URL}/health`, {
          headers: { 'x-api-key': INTERNAL_API_KEY },
        });
        if (!res.ok) throw new Error('collab error');
        return res.json();
      }),
    ]);

    const services = [users, boards, auth, collab];
    return { healthy: services.every((s) => s.status === 'ok'), services };
  }
}
