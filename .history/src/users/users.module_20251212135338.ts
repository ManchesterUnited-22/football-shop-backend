// src/users/users.module.ts

import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaModule } from '../../prisma/prisma.module'; // Đảm bảo đường dẫn đúng

@Module({
  imports: [PrismaModule], 
  providers: [UsersService],
  exports: [UsersService], // RẤT QUAN TRỌNG: Phải export để AuthModule sử dụng
})
export class UsersModule {}