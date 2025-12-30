import { Controller, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto'; 
import { RefreshTokenDto } from './dto/refresh-token.dto'; 
import type { Request } from 'express'; // Sử dụng 'import type' để tránh lỗi TS1272
import { JwtAuthGuard } from './guards/jwt-auth.guard'; 
// import { GetUser } from './decorators/get-user.decorator'; // (Tùy chọn)

@Controller('auth') 
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/login
  @Post('login')
  @HttpCode(200) 
  async login(@Body() authDto: AuthDto) {
    return this.authService.login(authDto);
  }

  // POST /auth/refresh-token
  @Post('refresh-token')
  @HttpCode(200)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    // Đảm bảo hàm refreshToken tồn tại trong AuthService
    return this.authService.refreshToken(refreshTokenDto.refreshToken); 
  }

  
  // POST /auth/logout
  // Đã sửa lỗi TS2554: Thêm UseGuards và truyền userId
  @UseGuards(JwtAuthGuard) 
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request) {
    // Lấy userId từ req.user (do JwtAuthGuard gắn vào)
    // Giả định req.user có thuộc tính 'id' kiểu number
    const userId = (req.user as any).id; 
    
    // Truyền userId vào service
    return this.authService.logout(userId); 
  }
}