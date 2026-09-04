import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { AUTH_SERVICE, IAuthService, JWT_SECRET, isCookieSecure } from '@app/common';
import { Request, Response } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private authService: IAuthService;

  constructor(
    @Inject(AUTH_SERVICE) private readonly client: ClientGrpc,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit() {
    this.authService = this.client.getService<IAuthService>('AuthService');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request  = context.switchToHttp().getRequest();
    const res: Response = context.switchToHttp().getResponse();

    let accessToken: string = req.cookies?.accessToken;
    const refreshToken: string = req.cookies?.refreshToken;

    if (!accessToken && !refreshToken) {
      throw new UnauthorizedException('Требуется авторизация');
    }

    if (accessToken) {
      const userId = this.verifyToken(accessToken);
      if (userId) {
        const result = await firstValueFrom(
          this.authService.validateUser({ userId }),
        );
        if (result.valid) {
          req['user'] = result.user;
          return true;
        }
      }
    }

    if (refreshToken) {
      try {
        const tokens = await firstValueFrom(
          this.authService.refreshToken({ refreshToken }),
        );
        this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
        accessToken = tokens.accessToken;

        const userId = this.verifyToken(accessToken);
        if (!userId) throw new UnauthorizedException('Невалидный токен после рефреша');

        const result = await firstValueFrom(
          this.authService.validateUser({ userId }),
        );
        if (result.valid) {
          req['user'] = result.user;
          return true;
        }
      } catch (err: any) {
        const isServiceUnavailable =
          err?.code === 14 ||
          err?.message?.toLowerCase().includes('unavailable') ||
          err?.message?.toLowerCase().includes('econnrefused');

        if (!isServiceUnavailable) {
          this.clearAuthCookies(res);
        }
        throw new UnauthorizedException('Сессия истекла');
      }
    }

    throw new UnauthorizedException('Невалидный токен');
  }

  private verifyToken(token: string): string | null {
    try {
      const payload = this.jwtService.verify(token, { secret: JWT_SECRET });
      return payload.sub ?? null;
    } catch {
      return null; 
    }
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('accessToken',  { httpOnly: true, sameSite: 'lax', path: '/' });
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax', path: '/' });
  }
}
