// src/order/order.controller.ts

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
    role: string; // ✅ Rất quan trọng cho việc phân quyền Admin
}

// ⚠️ Hàm Guard tùy chỉnh: Chỉ cho phép ADMIN truy cập
// (Bạn cần tạo AdminGuard thực tế, nhưng đây là cách xử lý nhanh trong Controller)
const AdminGuard = (user: UserPayload) => {
    if (user.role !== 'ADMIN') {
        throw new ForbiddenException('You do not have administrative privileges to perform this action.');
    }
}


@Controller('orders') // Endpoint sẽ là POST/GET /orders
@UsePipes(new ValidationPipe({ transform: true })) 
export class OrderController {
    constructor(private readonly orderService: OrderService,
        private readonly shippingService: ShippingService,
    ) {}

    // --- START: CÁC ROUTE CỤ THỂ HOẶC CÓ CHUỖI CỐ ĐỊNH ---

    // 1. ENDPOINT BẢO MẬT: Lấy đơn hàng của người đang đăng nhập
    @Get('me')
    @UseGuards(AuthGuard)
    async findMyOrders(@GetUser() user: UserPayload) {
        return this.orderService.findUserOrders(user.id);
    }
    
    // 2. Lấy đơn hàng theo User ID
    @Get('user/:userId') 
    async findUserOrders(@Param('userId', ParseIntPipe) userId: number) {
        return this.orderService.findUserOrders(userId);
    }
    @Patch(':id/create-shipping-label')
    @UseGuards(AuthGuard)
    async createShippingLabel(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: UserPayload
    ) {
        AdminGuard(user); // Kiểm tra quyền Admin

        // 1. Lấy chi tiết đơn hàng (cần OrderItems)
        // Chúng ta giả định OrdersService có hàm findOneWithDetails(id)
        const order = await this.orderService.findOneWithDetails(id); 

        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found.`);
        }
        
        // Tránh tạo vận đơn hai lần
        if (order.trackingCode) {
             return { message: 'Đơn hàng đã có mã vận đơn.', trackingCode: order.trackingCode };
        }

        // 2. Gọi Shipping Service để xử lý API bên thứ ba
        // const shippingData = await this.shippingService.createShippingLabel(order);

        // 3. Cập nhật mã vận đơn và trạng thái vào database
        // Chúng ta giả định OrdersService có hàm updateShippingInfo(...)
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
    
    @Patch(':id/process')
    @UseGuards(AuthGuard)
    async processOrder(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: UserPayload // Lấy user để kiểm tra quyền
    ) {
        AdminGuard(user); // Kiểm tra xem có phải ADMIN không
        // Chuyển trạng thái từ PENDING/PENDING_PAYMENT sang PROCESSING
        return this.orderService.processOrder(id);
    }
    
    @Patch(':id/ship')
    @UseGuards(AuthGuard)
    async shipOrder(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: UserPayload
    ) {
        AdminGuard(user);
        // Chuyển trạng thái sang SHIPPED
        return this.orderService.shipOrder(id);
    }

    /**
     * ✅ ENDPOINT QUAN TRỌNG: Đánh dấu đơn hàng ĐÃ GIAO THÀNH CÔNG (DELIVERED)
     * Khi gọi API này, đơn hàng sẽ được tính vào báo cáo bán hàng.
     */
    @Patch(':id/deliver')
    @UseGuards(AuthGuard)
    async deliverOrder(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: UserPayload
    ) {
        AdminGuard(user);
        // Chuyển trạng thái sang DELIVERED
        return this.orderService.deliverOrder(id);
    }

    @Patch(':id/cancel')
    @UseGuards(AuthGuard)
    async cancelOrder(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: UserPayload
    ) {
        AdminGuard(user);
        // Chuyển trạng thái sang CANCELLED
        return this.orderService.cancelOrder(id);
    }

    // ⭐️ END: CÁC ENDPOINT QUẢN LÝ TRẠNG THÁI (CHO ADMIN) ⭐️


    // --- START: CÁC ROUTE CHUNG VÀ CÓ THAM SỐ ĐỘNG CUỐI CÙNG ---

    @Get()
    async findAll(): Promise<Order[]> {
        return this.orderService.findAll();
    }
    
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const order = await this.orderService.findOne(id);
        
        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found.`);
        }
        return order;
    }

    // --- END: CÁC ROUTE CHUNG VÀ CÓ THAM SỐ ĐỘNG CUỐI CÙNG ---
    
    @Post()
    @UseGuards(AuthGuard) 
    async create(
      @Body() createOrderDto: CreateOrderDto,
      @GetUser() user: UserPayload
    ): Promise<Order> {
        return this.orderService.create(createOrderDto, user.id); 
    }
}