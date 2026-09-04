import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { RpcException, ClientGrpc } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import Redis from 'ioredis';
import {OTP_TTL_SECONDS, REFRESH_TTL_SECONDS} from "@app/common/constants"
import {
  USERS_SERVICE,
  IUsersService,
  UserPayload,
  JWT_SECRET,
  JWT_ACCESS_EXPIRES,
  JWT_REFRESH_EXPIRES,
} from '@app/common';
import { MailService } from './mail.service';



@Injectable()
export class AuthService implements OnModuleInit {
  private usersService: IUsersService;

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,

    @Inject(USERS_SERVICE)
    private readonly usersClient: ClientGrpc,

    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  onModuleInit() {
    this.usersService = this.usersClient.getService<IUsersService>('UsersService');
  }

  async sendAuthCode(email: string): Promise<{ message: string; success: boolean }> {
    const code = Math.floor(1000000 + Math.random() * 9000000).toString();
    await this.redis.set(`auth:code:${email}`, code, 'EX', OTP_TTL_SECONDS);

    console.log(`Код для ${email}: ${code}`);

    try {
      await this.mailService.sendOtpCode(email, code);
    } catch (err) {
      console.error(`SMTP failed for ${email}:`, err);
    }

    return { message: 'Код отправлен на почту', success: true };
  }


  async verifyAuthCode(
    email: string,
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: UserPayload }> {
    const stored = await this.redis.get(`auth:code:${email}`);

    if (!stored) throw new RpcException('Код не найден или истёк');
    if (stored !== code) throw new RpcException('Неверный код');

    await this.redis.del(`auth:code:${email}`);

    let user = await firstValueFrom(this.usersService.findByEmail({ email }));
    if (!user?.id) {
      user = await firstValueFrom(this.usersService.create({ email }));
    }

    if (user.isBlocked) throw new RpcException('Аккаунт заблокирован');

    return { ...(await this.generateTokens(user)), user };
  }


  async oAuthLogin(
    email: string,
    name: string,
    avatar: string,
    provider?: string,
    providerId?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: UserPayload }> {
    let user: UserPayload | null = null;
    if (provider && providerId) {
      const byProvider = await firstValueFrom(
        this.usersService.findByProviderId({ provider, providerId }),
      );
      if (byProvider?.id) user = byProvider;
    }

    if (!user) {
      const byEmail = await firstValueFrom(this.usersService.findByEmail({ email }));
      if (byEmail?.id) user = byEmail;
    }

    if (!user) {
      user = await firstValueFrom(this.usersService.create({ email }));
    }

    if (user.id && ((!user.name && name) || (!user.avatar && avatar))) {
      const update: { name?: string; avatar?: string } = {};
      if (!user.name && name) update.name = name;
      if (!user.avatar && avatar) update.avatar = avatar;
      user = await firstValueFrom(this.usersService.updateProfile({ id: user.id, ...update }));
    }

    if (user.id && provider && providerId) {
      const providerField = provider === 'google' ? 'googleId' : provider === 'github' ? 'githubId' : null;
      if (providerField && !user[providerField]) {
        user = await firstValueFrom(this.usersService.linkProvider({ id: user.id, provider, providerId }));
      }
    }

    if (user.isBlocked) throw new RpcException('Аккаунт заблокирован');

    return { ...(await this.generateTokens(user)), user };
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { sub: string; email: string; role: string };

    try {
      payload = this.jwtService.verify(refreshToken, { secret: JWT_SECRET });
    } catch {
      throw new RpcException('Невалидный refresh token');
    }

    const stored = await this.redis.get(`refresh:${payload.sub}`);
    if (!stored || stored !== refreshToken) {
      throw new RpcException('Refresh token не найден или уже использован');
    }

    const user = await firstValueFrom(this.usersService.findById({ id: payload.sub }));
    if (!user?.id) throw new RpcException('Пользователь не найден');
    if (user.isBlocked) throw new RpcException('Аккаунт заблокирован');

    return this.generateTokens(user);
  }


  async logout(refreshToken: string): Promise<{ message: string; success: boolean }> {
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: JWT_SECRET });
      await this.redis.del(`refresh:${payload.sub}`);
    } catch {
    }
    return { message: 'Выход выполнен успешно', success: true };
  }

  async validateUser(userId: string): Promise<{ valid: boolean; user: UserPayload }> {
    try {
      const user = await firstValueFrom(this.usersService.findById({ id: userId }));
      if (!user?.id || user.isBlocked) return { valid: false, user: null };
      return { valid: true, user };
    } catch {
      return { valid: false, user: null };
    }
  }


  private async generateTokens(
    user: UserPayload,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken  = this.jwtService.sign(payload, { secret: JWT_SECRET, expiresIn: JWT_ACCESS_EXPIRES });
    const refreshToken = this.jwtService.sign(payload, { secret: JWT_SECRET, expiresIn: JWT_REFRESH_EXPIRES });

    await this.redis.set(`refresh:${user.id}`, refreshToken, 'EX', REFRESH_TTL_SECONDS);

    return { accessToken, refreshToken };
  }
}
