// src/order/order.module.ts (Đã sửa theo Phương án Bán Tự động)

import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '../../prisma/prisma.service'; 
import { PrismaModule } from '../../prisma/prisma.module';
import { OrderGateway } from './order.gateway';
// ❌ ĐÃ XÓA: ShippingModule không còn cần thiết vì OrderController không gọi ShippingService
// import { ShippingModule } from '../shipping/shipping.module'; 

@Module({
  // ✅ ĐÃ SỬA: Loại bỏ ShippingModule
  imports: [PrismaModule, /* ShippingModule */], 
  controllers: [OrderController],
  // Giữ PrismaService ở đây là đúng nếu nó chưa được export từ PrismaModule hoặc bạn muốn đảm bảo
  providers: [OrderService, PrismaService], 
})
export class OrderModule {}