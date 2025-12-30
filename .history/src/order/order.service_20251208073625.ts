// src/order/order.service.ts

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto'; 
import { Order, OrderStatus } from '@prisma/client'; 

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    
    const SHIPPING_FEE = 30000; 
    
    // 1. Tính toán lại Total Amount
    const subtotal = createOrderDto.items.reduce(
        (sum, item) => sum + (item.priceAtPurchase * item.quantity),
        0,
    );
    
    const calculatedTotalAmount = subtotal + SHIPPING_FEE;
    
    if (Math.abs(calculatedTotalAmount - createOrderDto.totalAmount) > 0.01) {
        throw new BadRequestException('Tổng số tiền đơn hàng không khớp với tính toán.');
    }

    // 2. Lấy thông tin chi tiết sản phẩm/variant cần thiết cho việc hiển thị (Denormalization)
    
    
    // 3. Tạo Đơn hàng bằng Prisma
    const newOrder = await this.prisma.order.create({
      data: {
        userId: createOrderDto.userId, 
        customerName: createOrderDto.customerName,
        customerPhone: createOrderDto.customerPhone,
        shippingAddress: createOrderDto.shippingAddress,
        totalAmount: calculatedTotalAmount,
        // Giả định bạn có trường shippingFee trong Order model
        // shippingFee: SHIPPING_FEE, 
        status: createOrderDto.status || OrderStatus.PENDING,
        
        items: {
          createMany: {
                data: createOrderDto.items.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    priceAtPurchase: item.priceAtPurchase,
                    
                    // GHI CÁC TRƯỜNG HIỂN THỊ
                    
                })),
            },
        },
      },
      include: {
        items: true,
      },
    });

    return newOrder;
  }

  async findAll(): Promise<Order[]> {
    return this.prisma.order.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
        where: { id },
        include: { 
            items: true
        }
    });

    if (!order) {
        return null;
    }
    return order;
  }
  
  /**
   * Lấy tất cả đơn hàng của một người dùng cụ thể. (API Đơn giản hóa)
   */
  

}