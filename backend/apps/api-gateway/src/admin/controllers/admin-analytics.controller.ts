import {
  Controller,
  Get,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import {
  BOARDS_SERVICE,
  IBoardsService,
  USERS_SERVICE,
  IUsersService,
  COLLAB_INTERNAL_URL,
  INTERNAL_API_KEY,
  Role,
} from '@app/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Admin — Analytics')
@ApiCookieAuth('accessToken')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAnalyticsController implements OnModuleInit {
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

  // GET /admin/analytics/overview 
  @Get('overview')
  @Roles(Role.MANAGER)
  @ApiOperation({ summary: '[MANAGER+] Общая аналитика: юзеры, доски, пространства, онлайн' })
  @ApiResponse({ status: 200, description: 'Сводка по системе' })
  async getOverview() {
    const [userStats, boardStats] = await Promise.all([
      firstValueFrom(this.usersService.getStats({})),
      firstValueFrom(this.boardsService.getBoardStats({})),
    ]);

    let online = { totalOnlineUsers: 0, totalOnlineBoards: 0 };
    try {
      const res = await fetch(`${COLLAB_INTERNAL_URL}/online`, {
        headers: { 'x-api-key': INTERNAL_API_KEY },
      });
      online = await res.json();
    } catch {}

    return {
      users: {
        total:   userStats.totalUsers,
        today:   userStats.todayUsers,
        blocked: userStats.blockedUsers,
      },
      boards: {
        total: boardStats.totalBoards,
        today: boardStats.todayBoards,
      },
      spaces: {
        total: boardStats.totalSpaces,
        today: boardStats.todaySpaces,
      },
      online: {
        users:  online.totalOnlineUsers,
        boards: online.totalOnlineBoards,
      },
    };
  }

  // GET /admin/analytics/timeseries
  @Get('timeseries')
  @Roles(Role.MANAGER)
  @ApiOperation({
    summary: '[MANAGER+] Агрегированные ряды для графиков дашборда',
    description: 'Ежемесячные счётчики регистраций/досок/пространств + ежедневная активность (heatmap). Всё агрегировано на БД через GROUP BY — не тянет сырых сущностей.',
  })
  @ApiQuery({ name: 'months', required: false, description: 'Кол-во месячных бакетов (default 6, max 36)' })
  @ApiQuery({ name: 'days',   required: false, description: 'Кол-во дневных бакетов для heatmap (default 182, max 730)' })
  @ApiResponse({ status: 200, description: 'Массивы счётчиков + total' })
  async getTimeseries(
    @Query('months') monthsQ = '6',
    @Query('days')   daysQ   = '182',
  ) {
    const months = Math.max(1, Math.min(36,  Number(monthsQ) || 6));
    const days   = Math.max(1, Math.min(730, Number(daysQ)   || 182));

    const [users, boards] = await Promise.all([
      firstValueFrom(this.usersService.getUsersTimeseries({ months, days })),
      firstValueFrom(this.boardsService.getBoardsTimeseries({ months })),
    ]);

    return {
      usersMonthly:  users.usersMonthly  ?? [],
      boardsMonthly: boards.boardsMonthly ?? [],
      spacesMonthly: boards.spacesMonthly ?? [],
      activityDaily: users.activityDaily ?? [],
      activityTotal: users.activityTotal ?? 0,
    };
  }
}
