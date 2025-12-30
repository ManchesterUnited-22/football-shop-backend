// backend/src/auth/auth.service.ts

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

// =================================================================
// ĐÃ XÓA: const RT_STORAGE = new Map<number, string>(); 
// Bây giờ chúng ta sử dụng UsersService để tương tác với DB (Prisma)
// =================================================================

interface JwtPayload {
    sub: number;
    email: string;
    name: string;
    role: Role;
}


@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

    // ===========================
    // HÀM QUẢN LÝ REFRESH TOKEN (Đã cập nhật để dùng DB)
    // ===========================

    // 1. LƯU RT VÀO DB
    private async saveRefreshToken(userId: number, token: string | null): Promise<void> {
        // Gọi UsersService (đã được sửa đổi để dùng Prisma)
        await this.usersService.updateRefreshToken(userId, token);
        console.log(`[RT] Saved/Removed RT for user ${userId}`);
    }

    // 2. KIỂM TRA RT CÓ HỢP LỆ TRONG DB KHÔNG
    private async isRefreshTokenValid(userId: number, token: string): Promise<boolean> {
        const storedToken = await this.usersService.getRefreshToken(userId);
        // Trả về true nếu RT hiện tại khớp với RT trong DB
        return storedToken === token;
    }

    // ===========================
    // ĐĂNG KÝ (Không thay đổi)
    // ===========================
  async register(registerDto: RegisterDto) {
        // ... (Logic register giữ nguyên)
    const existingUser = await this.usersService.findOneByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email đã được đăng ký.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    const user = await this.usersService.create({
      name: registerDto.fullName,
      email: registerDto.email,
      password: hashedPassword,
    });

    const { password, ...result } = user;
    return result;
  }

    // ===========================
    // ĐĂNG NHẬP (Đã cập nhật)
    // ===========================
  async login(loginDto: LoginDto) {
        // ... (Xác thực user và tạo payload giữ nguyên)
    const user = await this.usersService.findOneByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    const isPasswordMatching = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      name: user.fullName,
      role: user.role,
    };

    // 1. Tạo Access token (AT) ngắn hạn
   const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
   });

    // 2. Tạo Refresh token (RT) dài hạn
    const refreshToken = this.jwtService.sign({ sub: user.id }, {
        secret: process.env.JWT_SECRET,
        expiresIn: '7d',
    });

    // 3. LƯU RT VÀO DB (ĐÃ CẬP NHẬT)
    await this.saveRefreshToken(user.id, refreshToken); 

    // ... (Trả về kết quả giữ nguyên)
    return {
      access_token: accessToken,
      refresh_token: refreshToken, 
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

    // ===========================
    // REFRESH TOKEN (Đã cập nhật)
    // ===========================
  async refresh(refreshToken: string) {
    try {
      // 1. Verify token
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET,
      }) as { sub: number };

      // 2. Kiểm tra User có tồn tại không
      const user = await this.usersService.findOneById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User không tồn tại.');
      }

      // 3. KIỂM TRA BẢO MẬT: RT có khớp với RT đã lưu trong DB không (ĐÃ CẬP NHẬT)
      const isValid = await this.isRefreshTokenValid(user.id, refreshToken);
      if (!isValid) {
          // Dọn dẹp token cũ nếu cần (tùy chọn)
          // await this.saveRefreshToken(user.id, null); 
          throw new UnauthorizedException('Refresh token đã bị thu hồi.');
      }

      // 4. Tạo Payload cho AT mới (giữ nguyên)
      const newPayload: JwtPayload = {
          sub: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
      };

      // 5. Tạo Access Token MỚI (AT) (giữ nguyên)
      const newAccessToken = this.jwtService.sign(
        newPayload,
        { secret: process.env.JWT_SECRET, expiresIn: '15m' },
      );

      // 6. (TÙY CHỌN & KHUYẾN NGHỊ) Refresh Token Rotation: Cấp RT mới
      const newRefreshToken = this.jwtService.sign({ sub: user.id }, {
          secret: process.env.JWT_SECRET,
          expiresIn: '7d',
      });
      // Lưu RT mới (đè lên RT cũ) -> vô hiệu hóa RT cũ (ĐÃ CẬP NHẬT)
      await this.saveRefreshToken(user.id, newRefreshToken); 


      return { 
          access_token: newAccessToken,
          refresh_token: newRefreshToken 
      };
    } catch (e) {
        // Bắt lỗi hết hạn của RT hoặc lỗi verify
        console.error("Refresh failed:", e);
        // Trong trường hợp RT đã hết hạn, NestJS sẽ ném ra lỗi.
        throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn.');
    }
  }


    // ===========================
    // LOGOUT (Đã cập nhật)
    // ===========================
    async logout(userId?: number) {
        // Xóa refresh token khỏi DB khi user logout
        if (userId) { 
            await this.saveRefreshToken(userId, null); // Gán null để xóa RT khỏi DB
        }
        return { message: 'Đăng xuất thành công' };
    }
}