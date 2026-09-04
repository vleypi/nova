import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod('AuthService', 'SendAuthCode')
  sendAuthCode(data: { email: string }) {
    return this.authService.sendAuthCode(data.email);
  }

  @GrpcMethod('AuthService', 'VerifyAuthCode')
  verifyAuthCode(data: { email: string; code: string }) {
    return this.authService.verifyAuthCode(data.email, data.code);
  }

  @GrpcMethod('AuthService', 'OAuthLogin')
  oAuthLogin(data: { email: string; name: string; avatar: string; provider: string; providerId: string }) {
    return this.authService.oAuthLogin(data.email, data.name, data.avatar, data.provider, data.providerId);
  }

  @GrpcMethod('AuthService', 'RefreshToken')
  refreshToken(data: { refreshToken: string }) {
    return this.authService.refreshAccessToken(data.refreshToken);
  }

  @GrpcMethod('AuthService', 'Logout')
  logout(data: { refreshToken: string }) {
    return this.authService.logout(data.refreshToken);
  }

  @GrpcMethod('AuthService', 'ValidateUser')
  validateUser(data: { userId: string }) {
    return this.authService.validateUser(data.userId);
  }

  @GrpcMethod('AuthService', 'Ping')
  ping() {
    return { ok: true };
  }
}
