import {
  Controller,
  Get,
  Patch,
  Body,
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
} from '@nestjs/swagger';
import { USERS_SERVICE, IUsersService, UserPayload } from '@app/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@ApiCookieAuth('accessToken')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController implements OnModuleInit {
  private usersService: IUsersService;

  constructor(@Inject(USERS_SERVICE) private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.usersService = this.client.getService<IUsersService>('UsersService');
  }

  // GET /users/me 
  @Get('me')
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Данные пользователя' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  me(@Req() req: Request): UserPayload {
    return req['user'];
  }

  // GET /users/is-authenticated 
  @Get('is-authenticated')
  @ApiOperation({ summary: 'Проверить наличие активной сессии' })
  @ApiResponse({ status: 200, description: '{ authenticated: true }' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  isAuthenticated(): { authenticated: boolean } {
    return { authenticated: true };
  }

  //PATCH /users/me 
  @Patch('me')
  @ApiOperation({ summary: 'Обновить профиль текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Обновлённые данные пользователя' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async updateProfile(
    @Req() req: Request,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserPayload> {
    const user: UserPayload = req['user'];
    return firstValueFrom(
      this.usersService.updateProfile({ id: user.id, ...dto }),
    );
  }
}
