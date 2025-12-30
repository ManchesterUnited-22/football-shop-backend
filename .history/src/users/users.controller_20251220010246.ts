// src/users/users.controller.ts
import { Controller, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; 
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthService } from '../auth/auth.service'; // Đã thêm import này

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService, // Đã thêm injection này
  ) {}

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    // 1. Lấy userId từ thông tin giải mã Token
    const userId = req.user.id; 

    // 2. Gọi service để cập nhật thông tin trong Database
    const updatedUser = await this.usersService.updateProfile(userId, updateDto);

    // 3. Tạo Token mới chứa thông tin đã cập nhật (tên mới)
    // Lưu ý: Tên hàm 'generateToken' có thể thay đổi tùy theo file auth.service của bạn
    const { access_token } = await this.authService.generateToken(updatedUser);

    // 4. Trả về kết quả cho Frontend
    return {
      message: 'Cập nhật hồ sơ thành công',
      user: updatedUser,
      access_token: access_token, // Token mới để Frontend ghi đè
    };
  }
}