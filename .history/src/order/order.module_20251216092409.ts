import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '../../prisma/prisma.service'; 
import { PrismaModule } from '../../prisma/prisma.module';
import { ShippingModule } from '../shipping/shipping.module';
@Module({
 imports: [PrismaModule, ShippingModule], // Cần ProductsModule để truy cập ProductService (nếu cần)
  controllers: [OrderController],
  providers: [OrderService, PrismaService], 
})
export class OrderModule {}