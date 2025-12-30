// src/order/order.controller.ts (Đã Sửa Lỗi Biến và Lỗi ParseIntPipe)

import { Controller, Post, Body, UsePipes, ValidationPipe, Get, Param, ParseIntPipe, NotFoundException, UseGuards, Patch, ForbiddenException } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard'; 
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ShippingService } from '../shipping/shipping.service';

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

// Hàm trợ giúp chuyển đổi ID (Để loại bỏ ParseIntPipe gây lỗi 404)
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
    constructor(private readonly orderService: OrderService,
        private readonly shippingService: ShippingService,
    ) {}


    // =========================================================
    // ⭐️ PHẦN 1: CÁC ROUTE CÓ CHUỖI CỐ ĐỊNH VÀ ROUTE ADMIN (Dài hơn) ⭐️
    // =========================================================

    // 1. ENDPOINT BẢO MẬT: Lấy đơn hàng của người đang đăng nhập
    @Get('me') // GET /orders/me
    @UseGuards(AuthGuard)
    async findMyOrders(@GetUser() user: UserPayload) {
        return this.orderService.findUserOrders(user.id);
    }
    
    // 2. Lấy đơn hàng theo User ID
    @Get('user/:userId') // GET /orders/user/:userId
    async findUserOrders(@Param('userId', ParseIntPipe) userId: number) {
        return this.orderService.findUserOrders(userId);
    }
    
    // 3. TẠO VẬN ĐƠN (Đã sửa lỗi biến và ParseIntPipe)
    @Patch(':id/create-shipping-label') // PATCH /orders/:id/create-shipping-label
    @UseGuards(AuthGuard)
    async createShippingLabel(
        @Param('id') idStr: string, // Nhận ID là string an toàn
        @GetUser() user: UserPayload
    ) {
        const id = safeParseInt(idStr); // ✅ CHUYỂN ĐỔI AN TOÀN VÀ KIỂM TRA
        AdminGuard(user); 

        const order = await this.orderService.findOneWithDetails(id); // ✅ Sử dụng biến 'id'

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found.`);
        }
        
        if (order.trackingCode) {
             return { message: 'Đơn hàng đã có mã vận đơn.', trackingCode: order.trackingCode };
        }
        
        // Giả định order.status đã là PROCESSING
        const shippingData = await this.shippingService.createShippingLabel(order);
        
        const updatedOrder = await this.orderService.updateShippingInfo(
            id, 
            shippingData.trackingCode, 
            shippingData.labelUrl
        );

        return { 
            message: 'Tạo vận đơn và cập nhật đơn hàng thành công!', 
            order: updatedOrder,
            trackingCode: shippingData.trackingCode
        };
    }
    
    // 4. CHUYỂN SANG PROCESSING (Đã sửa lỗi ParseIntPipe)
    @Patch(':id/process') // PATCH /orders/:id/process
    @UseGuards(AuthGuard)
    async processOrder(
        @Param('id') idStr: string,
        @GetUser() user: UserPayload
    ) {
        const id = safeParseInt(idStr);
        AdminGuard(user);
        return this.orderService.processOrder(id);
    }
    
    // 5. CHUYỂN SANG SHIPPED (Đã sửa lỗi ParseIntPipe)
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

    // 6. CHUYỂN SANG DELIVERED (Đã sửa lỗi ParseIntPipe)
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

    // 7. CHUYỂN SANG CANCELLED (Đã sửa lỗi ParseIntPipe)
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
    // ⭐️ PHẦN 2: CÁC ROUTE CƠ BẢN VÀ CÓ THAM SỐ ĐƠN (Giữ ParseIntPipe) ⭐️
    // =========================================================
    
    // 8. LẤY TẤT CẢ ĐƠN HÀNG (Dùng cho Admin Dashboard)
    @Get() // GET /orders
    async findAll(): Promise<Order[]> {
        return this.orderService.findAll();
    }
    
    // 9. LẤY CHI TIẾT ĐƠN HÀNG (Giữ ParseIntPipe vì không có xung đột)
    @Get(':id') // GET /orders/:id
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const order = await this.orderService.findOne(id);
        
        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found.`);
        }
        return order;
    }
    
    // 10. TẠO ĐƠN HÀNG MỚI
    @Post() // POST /orders
    @UseGuards(AuthGuard) 
    async create(
        @Body() createOrderDto: CreateOrderDto,
        @GetUser() user: UserPayload
    ): Promise<Order> {
        return this.orderService.create(createOrderDto, user.id); 
    }
}