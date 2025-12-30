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
    ArrayMinSize,
    IsEnum
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export type PaymentMethod = 'COD' | 'BANK_TRANSFER';

// ====================================================
// 1. DTO cho từng Item trong Đơn hàng (Khớp với OrderItem Model)
// ====================================================
export class CreateOrderItemDto {
    
    @IsInt()
    @IsNotEmpty()
    productId: number; // ID của Product (Int)
    
    @IsInt()
    @IsNotEmpty()
    variantId: number; // ID của ProductVariant (Int)

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

    @IsNumber()
    @IsNotEmpty()
    totalAmount: number; 

    // ✅ TỐI ƯU HÓA: Đặt là @IsNotEmpty()
    @IsString()
    @IsIn(['COD', 'BANK_TRANSFER']) 
    @IsNotEmpty()
    paymentMethod: 'COD' | 'BANK_TRANSFER'; 
    
    // ✅ SỬA LỖI TÊN TRƯỜNG: Đổi từ 'notes' thành 'note'
    @IsOptional()
    @IsString()
    note?: string; // Ghi chú (nếu có trong form Checkout)
    
    // ⭐️ DANH SÁCH ITEMS ⭐️
    @IsArray()
    @ArrayMinSize(1) // Đảm bảo giỏ hàng không trống
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[];

    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;
}
// src/orders/dto/order.dto.ts

// Dùng các trạng thái chuẩn trong quy trình E-commerce
export enum OrderStatus {
    PENDING = 'PENDING',        // Chờ thanh toán/Xác nhận
    PROCESSING = 'PROCESSING',  // Đã xác nhận, đang đóng gói
    SHIPPED = 'SHIPPED',        // Đã gửi cho đơn vị vận chuyển
    DELIVERED = 'DELIVERED',    // Đã giao hàng thành công
    CANCELLED = 'CANCELLED',    // Đã hủy
}

// Bạn có thể thêm các DTO khác ở đây (ví dụ: CreateOrderDto)