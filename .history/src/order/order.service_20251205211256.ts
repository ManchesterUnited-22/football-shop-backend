import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { SizeType, OrderStatus, Prisma } from '@prisma/client';

// =========================================================
// HÀM TIỆN ÍCH TÍNH TOÁN GIÁ (Sao chép từ ProductService để Order Service tự chủ)
// =========================================================
function calculateFinalPrice(basePrice: number, sizeValue: string, threshold: string | null, percentage: number | null): number {
    if (!basePrice || !percentage || percentage === null || !threshold) {
        return basePrice;
    }

    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

    const numThreshold = parseFloat(threshold);
    const numSizeValue = parseFloat(sizeValue);
    
    // Logic cho Size Số
    if (!isNaN(numThreshold) && !isNaN(numSizeValue)) {
        if (numSizeValue >= numThreshold) {
            return basePrice * (1 + percentage / 100);
        }
        return basePrice;
    }

    // Logic cho Size Chữ cái
    const thresholdIndex = sizeOrder.indexOf(threshold.toUpperCase());
    const variantIndex = sizeOrder.indexOf(sizeValue.toUpperCase());

    if (thresholdIndex === -1 || variantIndex === -1) {
        return basePrice;
    }
    
    if (variantIndex >= thresholdIndex) {
        return basePrice * (1 + percentage / 100);
    }

    return basePrice;
}


@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
  ) {}

  // =========================================================
  // TẠO ĐƠN HÀNG MỚI VÀ CẬP NHẬT TỒN KHO (TRANSACTION)
  // =========================================================
async findAllOrders(userId: number) {
  return this.prisma.order.findMany({
    where: { userId: userId },
    include: { 
      items: {
        include: { variant: true, product: true } // Lấy thông tin chi tiết các mặt hàng
      } 
    },
    orderBy: { createdAt: 'desc' }, // Sắp xếp theo đơn hàng mới nhất
  });
}
// Trong OrderService.ts

async findOneOrder(userId: number, orderId: number) {
  const order = await this.prisma.order.findFirst({
    where: { id: orderId, userId: userId }, // Đảm bảo chỉ lấy đơn hàng của user đó
    include: { 
      items: {
        include: { variant: true, product: true }
      } 
    },
  });

  if (!order) {
    throw new NotFoundException(`Order ID ${orderId} not found or does not belong to the user.`);
  }
  return order;
}


  async createOrder(userId: number, createOrderDto: CreateOrderDto) {
    const { items, shippingAddress } = createOrderDto;
    
    if (items.length === 0) {
      throw new BadRequestException('Order must contain at least one item.');
    }

    let totalAmount = 0;
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];
    const stockUpdatePromises: Prisma.PrismaPromise<any>[] = [];

    // 1. DUYỆT QUA ITEMS, TÍNH GIÁ VÀ KIỂM TRA TỒN KHO
    for (const item of items) {
      const { productId, sizeValue, quantity } = item;

      // Lấy Product và TẤT CẢ Variants để tìm kiếm Variant khớp với sizeValue
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { variants: true }, // Lấy tất cả variants
      });

      if (!product) {
        throw new NotFoundException(`Product ID ${productId} not found.`);
      }
      
      // >>> BƯỚC QUAN TRỌNG: TÌM VARIANT DỰA TRÊN sizeValue <<<
      const variant = product.variants.find(v => v.sizeValue === sizeValue);
      
      if (!variant) {
        throw new NotFoundException(`Variant size "${sizeValue}" not found for Product ID ${productId}.`);
      }
      
      const variantId = variant.id;
      
      // Kiểm tra tồn kho
      if (variant.stock < quantity) {
        throw new BadRequestException(`Insufficient stock for variant ${sizeValue} (SKU: ${variant.sku}). Available: ${variant.stock}, Requested: ${quantity}`);
      }

      // Tính toán giá cuối cùng (Áp dụng logic giá động)
      const finalPrice = calculateFinalPrice(
        product.price,
        variant.sizeValue,
        product.sizeIncreaseThreshold,
        product.sizeIncreasePercentage,
      );

      const subtotal = finalPrice * quantity;
      totalAmount += subtotal;

      // Chuẩn bị dữ liệu cho OrderItem
      orderItemsData.push({
        productId: productId,
        variantId: variantId,
        quantity: quantity,
        priceAtPurchase: finalPrice,
      });

      // Chuẩn bị cập nhật tồn kho (Giảm stock)
      stockUpdatePromises.push(
        this.prisma.productVariant.update({
          where: { id: variantId },
          data: { stock: { decrement: quantity } },
        }),
      );
    }

    // 2. THỰC HIỆN TRANSACTION: TẠO ORDER, ORDER ITEMS VÀ GIẢM TỒN KHO
    const newOrder = await this.prisma.$transaction(async (tx) => {
      
      // A. Tạo Order chính
      const order = await tx.order.create({
        data: {
          userId: userId,
          shippingAddress: shippingAddress,
          totalAmount: totalAmount,
          status: OrderStatus.PENDING, // Trạng thái ban đầu
        },
      });

      // B. Tạo Order Items (sử dụng order.id vừa tạo)
      const itemsWithOrderId = orderItemsData.map(item => ({
        ...item,
        orderId: order.id,
      }));
      await tx.orderItem.createMany({ data: itemsWithOrderId });

      // C. Cập nhật tồn kho (Thực thi các promises giảm stock)
      await Promise.all(stockUpdatePromises);

      return order; // Trả về Order đã tạo
    });

    return newOrder;
  }
}