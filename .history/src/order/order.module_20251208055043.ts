import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductsModule } from 'src/products/products.module'; 
import { Prisma } from 'src/prisma/prisma.service';

@Module({
  imports: [ProductsModule], // Cần ProductsModule để truy cập ProductService (nếu cần)
  controllers: [OrderController],
  providers: [OrderService, PrismaService], 
})
export class OrderModule {}