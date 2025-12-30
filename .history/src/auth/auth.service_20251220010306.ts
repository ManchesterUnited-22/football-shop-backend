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

  // =================================================================
  // HÀM MỚI: TẠO ACCESS TOKEN MỚI (Dùng khi cập nhật Profile)
  // =================================================================
  async generateToken(user: any) {
    // Payload phải khớp hoàn toàn với cấu trúc hàm login để Header không lỗi
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.fullName, // Lấy từ fullName trong DB trả về
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      }),
    };
  }

  // ===========================
  // HÀM QUẢN LÝ REFRESH TOKEN (Giữ nguyên gốc)
  // ===========================

  // 1. LƯU RT VÀO DB
  private async saveRefreshToken(userId: number, token: string | null): Promise<void> {
    await this.usersService.updateRefreshToken(userId, token);
    console.log(`[RT] Saved/Removed RT for user ${userId}`);
  }

  // 2. KIỂM TRA RT CÓ HỢP LỆ TRONG DB KHÔNG
  private async isRefreshTokenValid(userId: number, token: string): Promise<boolean> {
    const storedToken = await this.usersService.getRefreshToken(userId);
    return storedToken === token;
  }

  // ===========================
  // ĐĂNG KÝ (Giữ nguyên gốc)
  // ===========================
  async register(registerDto: RegisterDto) {
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
  // ĐĂNG NHẬP (Giữ nguyên gốc)
  // ===========================
  async login(loginDto: LoginDto) {
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

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign({ sub: user.id }, {
      secret: process.env.JWT_SECRET,
      expiresIn: '7d',
    });

    await this.saveRefreshToken(user.id, refreshToken); 

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
  // REFRESH TOKEN (Giữ nguyên gốc)
  // ===========================
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET,
      }) as { sub: number };

      const user = await this.usersService.findOneById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User không tồn tại.');
      }

      const isValid = await this.isRefreshTokenValid(user.id, refreshToken);
      if (!isValid) {
        throw new UnauthorizedException('Refresh token đã bị thu hồi.');
      }

      const newPayload: JwtPayload = {
          sub: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
      };

      const newAccessToken = this.jwtService.sign(
        newPayload,
        { secret: process.env.JWT_SECRET, expiresIn: '15m' },
      );

      const newRefreshToken = this.jwtService.sign({ sub: user.id }, {
          secret: process.env.JWT_SECRET,
          expiresIn: '7d',
      });
      
      await this.saveRefreshToken(user.id, newRefreshToken); 

      return { 
          access_token: newAccessToken,
          refresh_token: newRefreshToken 
      };
    } catch (e) {
        console.error("Refresh failed:", e);
        throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn.');
    }
  }

  // ===========================
  // LOGOUT (Giữ nguyên gốc)
  // ===========================
  async logout(userId?: number) {
    if (userId) { 
      await this.saveRefreshToken(userId, null); 
    }
    return { message: 'Đăng xuất thành công' };
  }
}