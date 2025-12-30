import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    const ADMIN_KEY = process.env.ADMIN_API_KEY || 'admin-secret';
    const USER_KEY = process.env.USER_API_KEY || 'user-secret';

    if (!apiKey) throw new UnauthorizedException('Thiếu API key');

    if (apiKey === ADMIN_KEY) {
      request.user = { role: 'ADMIN' };
      return true;
    }
    if (apiKey === USER_KEY) {
      request.user = { role: 'USER' };
      return true;
    }

    throw new ForbiddenException('API key không hợp lệ');
  }
}
