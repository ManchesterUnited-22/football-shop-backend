import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from '../../prisma/prisma.service'; 
import { PrismaModule } from '../../prisma/prisma.module';
@Module({
 imports: [PrismaModule], // Cần ProductsModule để truy cập ProductService (nếu cần)
  controllers: [OrderController],
  providers: [OrderService, PrismaService], 
})
export class OrderModule {}