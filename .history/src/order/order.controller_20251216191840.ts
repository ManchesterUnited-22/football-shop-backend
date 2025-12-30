// src/order/order.controller.ts (Phiên bản Bán Tự động Đã Sửa)

import { Controller, Post, Body, UsePipes, ValidationPipe, Get, Param, ParseIntPipe, NotFoundException, UseGuards, Patch, ForbiddenException, BadRequestException } from '@nestjs/common'; // Thêm BadRequestException
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard'; 
import { GetUser } from '../auth/decorators/get-user.decorator';
// ✅ ĐÃ XÓA: Loại bỏ ShippingService vì không dùng API tự động nữa
// import { ShippingService } from '../shipping/shipping.service'; 

// Giả định cấu trúc Payload từ token JWT
interface UserPayload {
    id: number;
    email: string;
    role: string;
}

// Hàm Guard tùy chỉnh: Chỉ cho phép ADMIN truy cập
const AdminGuard = (user: UserPayload) => {
    if (user.role !== 'ADMIN') {
        throw new ForbiddenException('You do not have administrative privileges to perform this action.');
    }
}

// Hàm trợ giúp chuyển đổi ID an toàn
const safeParseInt = (idStr: string): number => {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
        throw new NotFoundException(`Invalid Order ID provided.`);
    }
    return id;
};


@Controller('orders') // Endpoint: /orders
@UsePipes(new ValidationPipe({ transform: true })) 
export class OrderController {
    // ✅ ĐÃ SỬA: Loại bỏ shippingService khỏi constructor
    constructor(private readonly orderService: OrderService) {} 


    // =========================================================
    // ⭐️ PHẦN 1: CÁC ROUTE CÓ CHUỖI CỐ ĐỊNH VÀ ROUTE ADMIN ⭐️
    // =========================================================

    // 1. ENDPOINT BẢO MẬT: Lấy đơn hàng của người đang đăng nhập (Giữ nguyên)
    @Get('me') // GET /orders/me
    @UseGuards(AuthGuard)
    async findMyOrders(@GetUser() user: UserPayload) {
        return this.orderService.findUserOrders(user.id);
    }
    
    // 2. Lấy đơn hàng theo User ID (Giữ nguyên)
    @Get('user/:userId') // GET /orders/user/:userId
    async findUserOrders(@Param('userId', ParseIntPipe) userId: number) {
        return this.orderService.findUserOrders(userId);
    }
    
    // ⚠️ ĐÃ XÓA: Logic tạo vận đơn tự động (createShippingLabel)
    
    // 3. CHUYỂN SANG PROCESSING (BƯỚC 1 CỦA XỬ LÝ VẬN ĐƠN)
    @Patch(':id/process') // PATCH /orders/:id/process
    @UseGuards(AuthGuard)
    async processOrder(
        @Param('id') idStr: string,
        @GetUser() user: UserPayload
    ) {
        const id = safeParseInt(idStr);
        AdminGuard(user);
        
        // 1. Chuyển trạng thái sang PROCESSING
        const order = await this.orderService.processOrder(id);

        // 2. LOG THÔNG TIN CẦN THIẾT cho Admin
        console.log(`\n=================================================`);
        console.log(`✅ Đơn hàng ${id} đã được xử lý (PROCESSING).`);
        console.log(`   ➡️ Yêu cầu tạo vận đơn thủ công trên GHN/GHTK.`);
        // Lưu ý: customerName, customerPhone, shippingAddress phải có sẵn trong object Order trả về từ Service
        console.log(`   - Tên KH: ${order.customerName}`); 
        console.log(`   - SĐT: ${order.customerPhone}`);
        console.log(`   - Địa chỉ: ${order.shippingAddress}`);
        console.log(`   - Tổng tiền COD: ${order.totalAmount} VNĐ`);
        console.log(`=================================================\n`);

        return { 
            message: 'Đã chuyển sang PROCESSING. Vui lòng tạo vận đơn thủ công.', 
            order 
        };
    }

    // 4. ✅ ĐÃ THÊM: CẬP NHẬT MÃ VẬN ĐƠN (BƯỚC 2 CỦA XỬ LÝ VẬN ĐƠN)
    @Patch(':id/update-tracking-code') // PATCH /orders/:id/update-tracking-code
    @UseGuards(AuthGuard)
    async updateTrackingCode(
        @Param('id') idStr: string,
        @Body('trackingCode') trackingCode: string, // Nhận mã vận đơn từ body
        @GetUser() user: UserPayload
    ) {
        const id = safeParseInt(idStr);
        AdminGuard(user);

        if (!trackingCode || trackingCode.trim() === '') {
            throw new BadRequestException('Mã vận đơn (trackingCode) là bắt buộc.');
        }

        // Gọi Service để cập nhật mã vận đơn và chuyển trạng thái sang SHIPPED
        // Lưu ý: Hàm này trong Service phải chấp nhận trackingCode và shippingLabelUrl (có thể là null)
        const updatedOrder = await this.orderService.updateShippingInfo(
            id, 
            trackingCode, 
            null
        );

        return { 
            message: 'Cập nhật mã vận đơn thành công và chuyển sang SHIPPED!', 
            order: updatedOrder 
        };
    }
    
    // 5. CHUYỂN SANG SHIPPED (Giữ nguyên)
    @Patch(':id/ship') // PATCH /orders/:id/ship
    @UseGuards(AuthGuard)
    async shipOrder(
        @Param('id') idStr: string,
        @GetUser() user: UserPayload
    ) {
        const id = safeParseInt(idStr);
        AdminGuard(user);
        return this.orderService.shipOrder(id);
    }

    // 6. CHUYỂN SANG DELIVERED (Giữ nguyên)
    @Patch(':id/deliver') // PATCH /orders/:id/deliver
    @UseGuards(AuthGuard)
    async deliverOrder(
        @Param('id') idStr: string,
        @GetUser() user: UserPayload
    ) {
        const id = safeParseInt(idStr);
        AdminGuard(user);
        return this.orderService.deliverOrder(id);
    }

    // 7. CHUYỂN SANG CANCELLED (Giữ nguyên)
    @Patch(':id/cancel') // PATCH /orders/:id/cancel
    @UseGuards(AuthGuard)
    async cancelOrder(
        @Param('id') idStr: string,
        @GetUser() user: UserPayload
    ) {
        const id = safeParseInt(idStr);
        AdminGuard(user);
        return this.orderService.cancelOrder(id);
    }


    // =========================================================
    // ⭐️ PHẦN 2: CÁC ROUTE CƠ BẢN ⭐️
    // =========================================================
    // 8. LẤY TẤT CẢ ĐƠN HÀNG (Giữ nguyên)
    @Get() // GET /orders
    async findAll(): Promise<Order[]> {
        return this.orderService.findAll();
    }
    
    // 9. LẤY CHI TIẾT ĐƠN HÀNG (Giữ nguyên)
    @Get(':id') // GET /orders/:id
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const order = await this.orderService.findOne(id);
        
        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found.`);
        }
        return order;
    }
    
    // 10. TẠO ĐƠN HÀNG MỚI (Giữ nguyên)
    @Post() // POST /orders
    @UseGuards(AuthGuard) 
    async create(
        @Body() createOrderDto: CreateOrderDto,
        @GetUser() user: UserPayload
    ): Promise<Order> {
        return this.orderService.create(createOrderDto, user.id); 
    }
}