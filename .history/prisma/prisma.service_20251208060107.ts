// src/prisma/prisma.service.ts

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
// Thêm OnModuleDestroy để đảm bảo kết nối được đóng khi NestJS tắt
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  
  async onModuleInit() {
    // Kết nối đến database khi module được khởi tạo
    await this.$connect(); 
  }

  async onModuleDestroy() {
    // Đóng kết nối khi module bị hủy
    await this.$disconnect();
  }

  // **Đã Xóa/Bỏ qua đoạn enableShutdownHooks gây lỗi 2345**
  // public async enableShutdownHooks(app: INestApplication) {
  //   this.$on('beforeExit', async () => {
  //     await app.close();
  //   });
  // }
}