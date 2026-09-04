import { Observable } from 'rxjs';
import { UserPayload } from './users.interface';

export interface IAuthService {
  sendAuthCode(data: { email: string }): Observable<AuthResponse>;
  verifyAuthCode(data: { email: string; code: string }): Observable<LoginResponse>;
  refreshToken(data: { refreshToken: string }): Observable<RefreshResponse>;
  logout(data: { refreshToken: string }): Observable<AuthResponse>;
  oAuthLogin(data: { email: string; name: string; avatar: string; provider: string; providerId: string }): Observable<LoginResponse>;
  validateUser(data: { userId: string }): Observable<ValidateUserResponse>;
  ping(data: Record<string, never>): Observable<{ ok: boolean }>;
}

export interface AuthResponse {
  message: string;
  success: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserPayload;
}

export interface RefreshResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
}

export interface ValidateUserResponse {
  valid: boolean;
  user: UserPayload;
}
