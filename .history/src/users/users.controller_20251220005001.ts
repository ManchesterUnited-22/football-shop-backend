// src/users/users.controller.ts
import { Controller, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Guard bạn đã làm
import { UsersService} from './users.service';
import { UpdateProfileDto} from ''

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard) // Chỉ người có Token mới vào được
  @Patch('profile')
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    // req.user.id lấy từ thông tin giải mã Token trong JwtStrategy của bạn
    const userId = req.user.id; 
    return this.usersService.updateProfile(userId, updateDto);
  }
}