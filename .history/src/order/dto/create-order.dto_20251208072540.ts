// src/order/dto/create-order.dto.ts

import { 
    IsNotEmpty, 
    IsInt, 
    IsString, 
    IsArray, 
    ValidateNested, 
    IsNumber, 
    IsIn, 
    IsOptional,
    ArrayMinSize
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

// ====================================================
// 1. DTO cho từng Item trong Đơn hàng (Khớp với OrderItem Model)
// ====================================================
export class CreateOrderItemDto {
  
  @IsInt()
  @IsNotEmpty()
  productId: number; // ID của Product (Int)
  
  // variantId (size, color, etc.) là bắt buộc để xác định item đã mua
  @IsInt()
  @IsNotEmpty()
  variantId: number; // ID của ProductVariant (Int)

  // Giá sản phẩm tại thời điểm mua (để tránh thay đổi giá)
  @IsNumber()
  @IsNotEmpty()
  priceAtPurchase: number; // Giá (Float)

  @IsInt()
  @IsNotEmpty()
  quantity: number; // Số lượng (Int)
}

// ===============================================
// 2. DTO cho toàn bộ Đơn hàng (Khớp với Order Model)
// ===============================================
export class CreateOrderDto {
  
  // ⭐️ THÔNG TIN BẮT BUỘC TỪ SCHEMA (QUAN HỆ VÀ DỮ LIỆU CHÍNH) ⭐️
  @IsInt()
  @IsNotEmpty()
  userId: number; // ID người dùng đặt hàng
  
  @IsString()
  @IsNotEmpty()
  customerName: string; // Tên khách hàng
  
  @IsString()
  @IsNotEmpty()
  customerPhone: string; // Số điện thoại

  @IsString()
  @IsNotEmpty()
  shippingAddress: string; // Địa chỉ giao hàng

  // Tổng tiền được tính toán từ Frontend (Backend sẽ tính lại để kiểm tra)
  @IsNumber()
  @IsNotEmpty()
  totalAmount: number; 

  // Hình thức thanh toán (Tùy chọn nếu bạn muốn lưu vào DB, mặc dù Status đã là PENDING)
  @IsString()
  @IsIn(['COD', 'TRANSFER']) 
  @IsOptional()
  paymentMethod: 'COD' | 'TRANSFER'; 
  
  @IsOptional()
  @IsString()
  notes: string; // Ghi chú (nếu có trong form Checkout)
  
  // ⭐️ DANH SÁCH ITEMS ⭐️
  @IsArray()
  @ArrayMinSize(1) // Đảm bảo giỏ hàng không trống
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}