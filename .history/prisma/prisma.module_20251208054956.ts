// src/prisma/prisma.module.ts

import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Giúp các module khác dễ dàng sử dụng mà không cần import lại
@Module({
  providers: [PrismaService],
  exports: [PrismaService], 
})
export class PrismaModule {}