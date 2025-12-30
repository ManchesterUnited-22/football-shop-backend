// src/auth/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { User, Role } from '@prisma/client'; // Import Role nếu cần

// Định nghĩa kiểu dữ liệu cho Payload (phải khớp với những gì bạn sign trong AuthService)
interface JwtPayload {
  email: string;
  sub: number; // User ID (phải là số)
  name: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) { 
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
      ignoreExpiration: false, 
      secretOrKey: process.env.JWT_SECRET, 
    });
  }

  // Hàm validate chỉ trả về các trường cần thiết (ID, email, role)
  async validate(payload: JwtPayload): Promise<any> { 
    
    // ⭐️ 1. Đảm bảo ID là kiểu số (chuyển đổi phòng trường hợp lỗi sign token) ⭐️
    const userId = Number(payload.sub); 

    // 2. Tìm kiếm User (Nên dùng findOneById nếu có)
    // Giả định UsersService có hàm findOneById(id: number)
    const user = await this.usersService.findOneById(userId); 

    if (!user) {
      throw new UnauthorizedException();
    }
    
    // ⭐️ 3. CHỈ TRẢ VỀ CÁC TRƯỜNG CẦN THIẾT cho Decorator @GetUser() ⭐️
    // Trả về đối tượng với trường 'id' để khớp với interface UserPayload trong Controller
    return { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        name: user.fullName // Thêm name để tiện sử dụng nếu cần
    }; 
  }
}