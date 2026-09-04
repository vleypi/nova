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
import { USERS_SERVICE, IUsersService, Role } from '@app/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Admin — Audit')
@ApiCookieAuth('accessToken')
@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAuditController implements OnModuleInit {
  private usersService: IUsersService;

  constructor(@Inject(USERS_SERVICE) private readonly usersClient: ClientGrpc) {}

  onModuleInit() {
    this.usersService = this.usersClient.getService<IUsersService>('UsersService');
  }

  // GET /admin/audit 
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN+] Лог административных действий' })
  @ApiQuery({ name: 'page',    required: false })
  @ApiQuery({ name: 'limit',   required: false })
  @ApiQuery({ name: 'action',  required: false, description: 'Фильтр по типу действия' })
  @ApiQuery({ name: 'actorId',  required: false, description: 'Фильтр по ID актора' })
  @ApiQuery({ name: 'targetId', required: false, description: 'Фильтр по ID цели действия' })
  @ApiResponse({ status: 200, description: 'Список действий с пагинацией' })
  async getAuditLogs(
    @Query('page')     page     = '1',
    @Query('limit')    limit    = '20',
    @Query('action')   action   = '',
    @Query('actorId')  actorId  = '',
    @Query('targetId') targetId = '',
  ) {
    const res = await firstValueFrom(
      this.usersService.getAuditLogs({
        page:     +page,
        limit:    +limit,
        action:   action   || undefined,
        actorId:  actorId  || undefined,
        targetId: targetId || undefined,
      }),
    );
    return { ...res, logs: res.logs ?? [] };
  }
}
