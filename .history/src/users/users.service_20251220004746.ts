import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Tìm user theo email (dùng cho login)
  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Tìm user theo id (dùng cho refresh token)
  async findOneById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // Tạo user mới (dùng cho register)
  async create(data: { name: string; email: string; password: string }) {
    return this.prisma.user.create({
      data: {
        fullName: data.name,
        email: data.email,
        password: data.password,
        role: 'USER', // hoặc mặc định role bạn muốn
      },
    });
  }
async updateRefreshToken(userId: number, token: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: token },
    });
  }
async updateProfile(userId: number, updateDto: UpdateProfileDto) {
  // Giả sử bạn dùng Prisma, nếu dùng TypeORM thì lệnh sẽ khác một chút
  return this.prisma.user.update({
    where: { id: userId },
    data: {
      name: updateDto.name,
    },
    select: { // Chỉ trả về thông tin cần thiết, không trả về password
      id: true,
      name: true,
      email: true,
      role: true
    }
  });
}


async getRefreshToken(userId: number): Promise<string | null> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { refreshToken: true },
        });
        // Trả về token hoặc null nếu không tìm thấy
        return user?.refreshToken ?? null; 
    }


}
