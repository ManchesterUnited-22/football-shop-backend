import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// JwtAuthGuard sử dụng chiến lược 'jwt' mà bạn đã định nghĩa trong jwt.strategy.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}