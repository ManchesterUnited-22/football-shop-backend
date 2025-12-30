import { Controller, Post, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto'; 
import { RefreshTokenDto } from './dto/refresh-token.dto'; 
import type { Request } from 'express'; // Khắc phục lỗi TS1272
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Guard để bảo vệ endpoint

@Controller('auth') // Endpoint chính là /auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/login
  @Post('login')
  @HttpCode(200) 
  async login(@Body() loginDto: LoginDto) { // Sử dụng loginDto thay vì authDto
    return this.authService.login(loginDto);
  }

  // POST /auth/refresh-token
  @Post('refresh-token')
  @HttpCode(200)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    // Gọi hàm refresh(refreshToken) đã được định nghĩa trong AuthService
    return this.authService.refresh(refreshTokenDto.refreshToken); 
  }

  // POST /auth/logout
  // Endpoint này cần bảo vệ (Guard) để xác định userId nào cần xóa token.
  // Khắc phục lỗi TS2554: Truyền userId vào service.
  @UseGuards(JwtAuthGuard) 
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request) {
    // 1. Lấy userId từ payload JWT đã được gắn vào req.user bởi JwtAuthGuard
    // (req.user as any).id tương ứng với 'sub' trong payload JWT
    const userId = (req.user as any).sub; 
    
    // 2. Truyền userId vào service để xóa refresh token khỏi DB
    return this.authService.logout(userId); 
  }

  // POST /auth/register
  // Endpoint này thường sử dụng RegisterDto (Giả định AuthDto có thể dùng thay thế nếu cùng cấu trúc)
  // Nếu bạn có RegisterDto riêng, hãy import và dùng nó.
  // Nếu không có, ta sẽ tạm thời dùng AuthDto.
  @Post('register')
  async register(@Body() registerDto: AuthDto) { 
      return this.authService.register(registerDto);
  }
}