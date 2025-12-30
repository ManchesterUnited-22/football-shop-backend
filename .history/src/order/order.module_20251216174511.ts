// src/order/order.module.ts

import { Module } from '@nestjs/common';
// XÓA DÒNG NÀY: import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaModule } from '../prisma/prisma.module'; // ✅ Đảm bảo import PrismaModule (hoặc đường dẫn tương ứng)
import { ShippingModule } from '../shipping/shipping.module'; // Nếu bạn có module này

// XÓA DÒNG NÀY: import { OrderRepository } from './order.repository'; 
// XÓA DÒNG NÀY: import { Order } from './entities/order.entity'; 

@Module({
  imports: [
    // XÓA KHỐI NÀY: TypeOrmModule.forFeature([...])
    PrismaModule, // ✅ Cần import để OrderService có thể Inject PrismaService
    ShippingModule, // Nếu cần
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    // XÓA DÒNG NÀY: OrderRepository, 
  ], 
  exports: [OrderService],
})
export class OrderModule {}