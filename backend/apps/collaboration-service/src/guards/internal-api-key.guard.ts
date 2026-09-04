import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { INTERNAL_API_KEY } from '@app/common';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || apiKey !== INTERNAL_API_KEY) {
      throw new UnauthorizedException('Неверный API-ключ');
    }

    return true;
  }
}
