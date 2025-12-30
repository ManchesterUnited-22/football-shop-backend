// src/auth/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { User } from '@prisma/client';

// Định nghĩa kiểu dữ liệu cho Payload (phải khớp với những gì bạn sign trong AuthService)
interface JwtPayload {
  email: string;
  sub: number; // User ID
  name: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) { // Inject UsersService để tìm User
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Lấy JWT từ header 'Authorization: Bearer <token>'
      ignoreExpiration: false, // Token phải còn hạn
      secretOrKey: process.env.JWT_SECRET || 'YOUR_SECURE_DEFAULT_SECRET', // Khóa bí mật (phải khớp với AuthModule)
    });
  }

  // Hàm validate sẽ được gọi sau khi JWT được giải mã thành công
  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findOneByEmail(payload.email);

    if (!user) {
      throw new UnauthorizedException();
    }
    
    // Khi thành công, NestJS sẽ đặt đối tượng user này vào request.user
    return user; 
  }
}