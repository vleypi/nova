import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Res,
  Req,
  Query,
  Param,
  HttpCode,
  UnauthorizedException,
  OnModuleInit,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Response, Request } from 'express';
import { firstValueFrom } from 'rxjs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCookieAuth,
  ApiExcludeEndpoint,
  ApiParam,
} from '@nestjs/swagger';
import {
  AUTH_SERVICE,
  USERS_SERVICE,
  IAuthService,
  IUsersService,
  UserPayload,
  AuthResponse,
  LoginResponse,
  RefreshResponse,
  isCookieSecure,
  CLIENT_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  JWT_SECRET,
} from '@app/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SendAuthCodeDto } from './dto/send-auth-code.dto';
import { VerifyAuthCodeDto } from './dto/verify-auth-code.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController implements OnModuleInit {
  private authService: IAuthService;
  private usersService: IUsersService;

  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientGrpc,
    @Inject(USERS_SERVICE) private readonly usersClient: ClientGrpc,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit() {
    this.authService = this.authClient.getService<IAuthService>('AuthService');
    this.usersService = this.usersClient.getService<IUsersService>('UsersService');
  }

  // POST /auth/send-code 
  @Post('send-code')
  @HttpCode(200)
  @ApiOperation({ summary: 'Отправить код подтверждения на email' })
  @ApiBody({ type: SendAuthCodeDto })
  @ApiResponse({ status: 200, description: 'Код отправлен' })
  async sendAuthCode(@Body() dto: SendAuthCodeDto): Promise<AuthResponse> {
    return firstValueFrom(this.authService.sendAuthCode({ email: dto.email }));
  }

  // POST /auth/verify-code 
  @Post('verify-code')
  @HttpCode(200)
  @ApiOperation({ summary: 'Верифицировать код и получить токены (в httpOnly cookies)' })
  @ApiBody({ type: VerifyAuthCodeDto })
  @ApiResponse({ status: 200, description: 'Авторизация успешна, токены установлены в cookies' })
  @ApiResponse({ status: 401, description: 'Неверный код' })
  async verifyAuthCode(
    @Body() dto: VerifyAuthCodeDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<LoginResponse, 'accessToken' | 'refreshToken'>> {
    const result = await firstValueFrom(
      this.authService.verifyAuthCode({ email: dto.email, code: dto.code }),
    );

    this.setAuthCookies(res, result.accessToken, result.refreshToken);

    return { user: result.user };
  }

  // POST /auth/refresh 
  @Post('refresh')
  @HttpCode(200)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Обновить токены по refreshToken из cookie' })
  @ApiResponse({ status: 200, description: 'Токены обновлены' })
  @ApiResponse({ status: 401, description: 'Refresh token не найден или невалидный' })
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new UnauthorizedException('Refresh token не найден');

    let result: RefreshResponse;
    try {
      result = await firstValueFrom(this.authService.refreshToken({ refreshToken }));
    } catch {
      this.clearAuthCookies(res);
      throw new UnauthorizedException('Невалидный refresh token');
    }

    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { success: true };
  }

  // POST /auth/logout 
  @Post('logout')
  @HttpCode(200)
  @ApiCookieAuth('accessToken')
  @ApiOperation({ summary: 'Выйти из системы (инвалидировать refresh token и очистить cookies)' })
  @ApiResponse({ status: 200, description: 'Выход выполнен' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await firstValueFrom(this.authService.logout({ refreshToken })).catch(() => {});
    }

    this.clearAuthCookies(res);
    return { message: 'Выход выполнен успешно', success: true };
  }


  @Get('google')
  @ApiExcludeEndpoint()
  googleRedirect(@Res() res: Response) {
    const callbackUrl = `${CLIENT_URL}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state: 'login',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  @Get('google/link')
  @ApiExcludeEndpoint()
  googleLinkRedirect(@Req() req: Request, @Res() res: Response) {
    const userId = this.extractUserId(req);
    if (!userId) return res.redirect(`${CLIENT_URL}/app/dashboard`);
    const callbackUrl = `${CLIENT_URL}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'select_account',
      state: `link:${userId}`,
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  @Get('google/callback')
  @ApiExcludeEndpoint()
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const callbackUrl = `${CLIENT_URL}/api/auth/google/callback`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, redirect_uri: callbackUrl, grant_type: 'authorization_code' }),
      });
      const tokens = await tokenRes.json();
      if (!tokens.access_token) throw new Error('No access token');

      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await profileRes.json();

      if (state?.startsWith('link:')) {
        const userId = state.slice(5);
        try {
          await firstValueFrom(this.usersService.linkProvider({ id: userId, provider: 'google', providerId: profile.id ?? '' }));
          res.redirect(`${CLIENT_URL}/app/dashboard?link=google_success`);
        } catch (err) {
          res.redirect(`${CLIENT_URL}/app/dashboard?linkError=${this.linkErrorCode(err)}&provider=google`);
        }
        return;
      }

      if (!profile.email) throw new Error('No email');
      const result = await firstValueFrom(
        this.authService.oAuthLogin({
          email: profile.email,
          name: profile.name ?? '',
          avatar: profile.picture ?? '',
          provider: 'google',
          providerId: profile.id ?? '',
        }),
      );
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
      res.redirect(`${CLIENT_URL}/app/dashboard`);
    } catch {
      res.redirect(`${CLIENT_URL}/auth?error=oauth_failed`);
    }
  }


  @Get('github')
  @ApiExcludeEndpoint()
  githubRedirect(@Res() res: Response) {
    const callbackUrl = `${CLIENT_URL}/api/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: callbackUrl,
      scope: 'user:email read:user',
      state: 'login',
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  }

  @Get('github/link')
  @ApiExcludeEndpoint()
  githubLinkRedirect(@Req() req: Request, @Res() res: Response) {
    const userId = this.extractUserId(req);
    if (!userId) return res.redirect(`${CLIENT_URL}/app/dashboard`);
    const callbackUrl = `${CLIENT_URL}/api/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: callbackUrl,
      scope: 'user:email read:user',
      state: `link:${userId}`,
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  }

  @Get('github/callback')
  @ApiExcludeEndpoint()
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const callbackUrl = `${CLIENT_URL}/api/auth/github/callback`;
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ code, client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, redirect_uri: callbackUrl }),
      });
      const tokens = await tokenRes.json();
      if (!tokens.access_token) throw new Error('No access token');

      const headers = { Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': 'Nova-App' };
      const profileRes = await fetch('https://api.github.com/user', { headers });
      const profile = await profileRes.json();

      // Link mode: just link provider to existing user
      if (state?.startsWith('link:')) {
        const userId = state.slice(5);
        try {
          await firstValueFrom(this.usersService.linkProvider({ id: userId, provider: 'github', providerId: String(profile.id ?? '') }));
          res.redirect(`${CLIENT_URL}/app/dashboard?link=github_success`);
        } catch (err) {
          res.redirect(`${CLIENT_URL}/app/dashboard?linkError=${this.linkErrorCode(err)}&provider=github`);
        }
        return;
      }

      let email = profile.email;
      if (!email) {
        const emailsRes = await fetch('https://api.github.com/user/emails', { headers });
        const emails = await emailsRes.json();
        const primary = emails.find((e: { primary: boolean; verified: boolean }) => e.primary && e.verified);
        email = primary?.email ?? emails[0]?.email;
      }
      if (!email) throw new Error('No email');

      const result = await firstValueFrom(
        this.authService.oAuthLogin({
          email,
          name: profile.name ?? profile.login ?? '',
          avatar: profile.avatar_url ?? '',
          provider: 'github',
          providerId: String(profile.id ?? ''),
        }),
      );
      this.setAuthCookies(res, result.accessToken, result.refreshToken);
      res.redirect(`${CLIENT_URL}/app/dashboard`);
    } catch {
      res.redirect(`${CLIENT_URL}/auth?error=oauth_failed`);
    }
  }

  @Delete('providers/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отключить OAuth-провайдер от аккаунта' })
  @ApiParam({ name: 'provider', description: 'google или github' })
  async unlinkProvider(@Req() req: Request, @Param('provider') provider: string) {
    const user: UserPayload = req['user'];
    return firstValueFrom(this.usersService.unlinkProvider({ id: user.id, provider }));
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

  private extractUserId(req: Request): string | null {
    const token = req.cookies?.accessToken;
    if (!token) return null;
    try {
      const payload = this.jwtService.verify(token, { secret: JWT_SECRET });
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  private linkErrorCode(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err ?? '');
    if (msg.includes('PROVIDER_ALREADY_LINKED')) return 'already_linked';
    return 'link_failed';
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('accessToken',  { httpOnly: true, sameSite: 'lax', path: '/' });
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'lax', path: '/' });
  }
}
