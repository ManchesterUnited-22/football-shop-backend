// src/order/order.service.ts

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto'; 
import { Order, OrderStatus } from '@prisma/client'; // Import OrderStatus

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService, // Inject PrismaService
  ) {}

  /**
   * Tạo đơn hàng mới, tính toán tổng tiền, và lưu thông tin hiển thị vào OrderItem.
   */
  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    
    // Giả định: Phí ship cố định.
    const SHIPPING_FEE = 30000; 
    
    // 1. Tính toán lại Total Amount (Kiểm tra bảo mật)
    const subtotal = createOrderDto.items.reduce(
        (sum, item) => sum + (item.priceAtPurchase * item.quantity),
        0,
    );
    
    const calculatedTotalAmount = subtotal + SHIPPING_FEE;
    
    if (Math.abs(calculatedTotalAmount - createOrderDto.totalAmount) > 0.01) {
        throw new BadRequestException('Tổng số tiền đơn hàng không khớp với tính toán.');
    }

    // 2. Lấy thông tin chi tiết sản phẩm/variant cần thiết cho việc hiển thị
    const itemsWithDetails = await Promise.all(
        createOrderDto.items.map(async (item) => {
            // Lấy thông tin hiển thị từ các bảng gốc
            const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
            const variant = await this.prisma.productVariant.findUnique({ where: { id: item.variantId } });
            
            if (!product || !variant) {
                 throw new BadRequestException(`Sản phẩm (ID: ${item.productId}) hoặc biến thể không hợp lệ.`);
            }

            return {
                ...item,
                // ⭐️ DỮ LIỆU ĐƯỢC CHUẨN BỊ ĐỂ GHI VÀO CÁC CỘT MỚI (Denormalization) ⭐️
                productName: product.name,
                imageUrl: product.images[0] || '', // Lấy ảnh đầu tiên trong mảng images
                sizeValue: variant.sizeValue, 
            };
        })
    );
    // 

[Image of database denormalization concept]


    // 3. Tạo Đơn hàng bằng Prisma
    const newOrder = await this.prisma.order.create({
      data: {
        userId: createOrderDto.userId, 
        customerName: createOrderDto.customerName,
        customerPhone: createOrderDto.customerPhone,
        shippingAddress: createOrderDto.shippingAddress,
        totalAmount: calculatedTotalAmount,
        shippingFee: SHIPPING_FEE, // Thêm phí ship vào Order
        status: createOrderDto.status || OrderStatus.PENDING, // Hoặc mặc định PENDING
        
        // Tạo OrderItem lồng nhau (Sử dụng createMany nếu DTO item phù hợp)
        items: {
          createMany: {
                data: itemsWithDetails.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    priceAtPurchase: item.priceAtPurchase,
                    // ⭐️ GHI CÁC TRƯỜNG HIỂN THỊ VÀO ORDER ITEM ⭐️
                    productName: item.productName,
                    imageUrl: item.imageUrl,
                    sizeValue: item.sizeValue,
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

---

## 🔍 Truy vấn Đơn hàng

```typescript
  // Lấy lịch sử đơn hàng (Lấy tất cả đơn hàng)
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
            items: true // Quan trọng: Lấy chi tiết OrderItems
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
  async findUserOrders(userId: number) {
    return this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }, 
        include: {
            // Chỉ cần include items: true vì các trường hiển thị đã được lưu sẵn
            items: true, 
        },
    });
  }

}