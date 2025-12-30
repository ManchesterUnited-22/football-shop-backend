// src/users/users.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // 1. Tìm user theo email (Dùng cho Login)
  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // 2. Tìm user theo id (Dùng cho Refresh Token & Profile)
  async findOneById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // 3. Tạo user mới (Dùng cho Register)
  async create(data: { name: string; email: string; password: string }) {
    return this.prisma.user.create({
      data: {
        fullName: data.name, // Khớp với trường trong Database của bạn
        email: data.email,
        password: data.password,
        role: 'USER', 
      },
    });
  }

  // 4. CẬP NHẬT HỒ SƠ (Quan trọng cho tính năng Edit Profile)
  async updateProfile(userId: number, updateDto: UpdateProfileDto) {
    try {
      // Kiểm tra user có tồn tại không trước khi update
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('Không tìm thấy người dùng');

      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          fullName: updateDto.name, // Map từ 'name' ở Frontend vào 'fullName' ở DB
          email: 
        },
        select: { 
          // Trả về các trường cần thiết để AuthService tạo Token mới
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      });
    } catch (error) {
      throw new BadRequestException('Lỗi khi cập nhật thông tin: ' + error.message);
    }
  }

  // 5. Cập nhật Refresh Token vào DB
  async updateRefreshToken(userId: number, token: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: token },
    });
  }

  // 6. Lấy Refresh Token từ DB để kiểm tra tính hợp lệ
  async getRefreshToken(userId: number): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refreshToken: true },
    });
    return user?.refreshToken ?? null; 
  }
}