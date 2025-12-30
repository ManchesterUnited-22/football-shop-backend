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