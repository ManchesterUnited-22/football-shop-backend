// src/order/order.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto'; 
import { Order } from '@prisma/client'; 

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService, // Inject PrismaService
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    
    // Giả định: Phí ship cố định.
    const SHIPPING_FEE = 30; 
    
    // 1. Tính toán lại Total Amount (Kiểm tra bảo mật)
    const subtotal = createOrderDto.items.reduce(
        (sum, item) => sum + (item.priceAtPurchase * item.quantity),
        0,
    );
    
    const calculatedTotalAmount = subtotal + SHIPPING_FEE;
    
    if (Math.abs(calculatedTotalAmount - createOrderDto.totalAmount) > 0.01) {
        throw new BadRequestException('Tổng số tiền đơn hàng không khớp với tính toán.');
    }

    // 2. Tạo Đơn hàng bằng Prisma
    const newOrder = await this.prisma.order.create({
      data: {
        userId: createOrderDto.userId, 
        customerName: createOrderDto.customerName, // Lưu Tên
        customerPhone: createOrderDto.customerPhone, // Lưu SĐT
        shippingAddress: createOrderDto.shippingAddress,
        totalAmount: calculatedTotalAmount, 
        
        // Tạo OrderItem lồng nhau (Đảm bảo khớp với OrderItem model trong schema.prisma)
        items: {
          create: createOrderDto.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            priceAtPurchase: item.priceAtPurchase,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return newOrder;
  }

  // Lấy lịch sử đơn hàng (Ví dụ: Lấy tất cả đơn hàng)
  async findAll(): Promise<Order[]> {
    return this.prisma.order.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' }
    });
  }
}