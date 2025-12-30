// src/users/users.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller'; // Đã thêm Controller vào đây
import { PrismaModule } from '../../prisma/prisma.module'; // Chỉnh lại đường dẫn nếu cần
import { AuthModule } from '../auth/auth.module'; // Import AuthModule

@Module({
  imports: [
    PrismaModule,
    // Sử dụng forwardRef để xử lý việc AuthModule và UsersModule gọi lẫn nhau
    forwardRef(() => AuthModule), 
  ],
  controllers: [UsersController], // Đã thêm Controller vào đây để nhận request PATCH /profile
  providers: [UsersService],
  exports: [UsersService], 
})
export class UsersModule {}