// src/order/order.controller.ts (Phiên bản Cuối cùng & Đã Sửa Lỗi 404)

import { Controller, Post, Body, UsePipes, ValidationPipe, Get, Param, ParseIntPipe, NotFoundException, UseGuards, Patch, ForbiddenException, BadRequestException } from '@nestjs/common'; 
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard'; 
import { GetUser } from '../auth/decorators/get-user.decorator';
// import { ShippingService } from '../shipping/shipping.service'; // Đã loại bỏ

// Giả định cấu trúc Payload từ token JWT
interface UserPayload {
    id: number;
    email: string;
    sub: number;
    role: string;
}

// Hàm Guard tùy chỉnh: Chỉ cho phép ADMIN truy cập
const AdminGuard = (user: UserPayload) => {
    // Thêm .trim() và .toUpperCase() để đảm bảo so sánh chính xác 100%
    const role = user.role?.trim().toUpperCase();
    if (role !== 'ADMIN') {
        throw new ForbiddenException('Bạn không có quyền quản trị để thực hiện hành động này.');
    }
}

// Hàm Guard tùy chỉnh: USER truy cập
const UserGuard = (user: UserPayload) => {
    const role = user.role?.trim().toUpperCase();
    if (role !== 'USER') {
        throw new ForbiddenException('Bạn không phải là khách hàng để thực hiện hành động này.');
    }
}

// Hàm trợ giúp chuyển đổi ID an toàn
const safeParseInt = (idStr: string): number => {
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
        throw new NotFoundException(`ID đơn hàng không hợp lệ.`);
    }
    return id;
};


@Controller('orders') // Endpoint: /orders
@UsePipes(new ValidationPipe({ transform: true })) 
export class OrderController {
    constructor(private readonly orderService: OrderService) {} 


    // =========================================================
    // ⭐️ PHẦN 1: CÁC ROUTE CHUYÊN BIỆT CHO USER ⭐️
    // =========================================================

    // 1. Lấy tất cả đơn hàng của người đang đăng nhập
    @Get('me') // GET /orders/me
    @UseGuards(AuthGuard)
    async findMyOrders(@GetUser() user: UserPayload) {
        return this.orderService.findUserOrders(user.id);
    }
    
    // 2. ✅ ĐÃ SỬA LỖI 404: Endpoint lấy đơn hàng SHIPPED của User 
    @Get('user/shipped') // GET /orders/user/shipped
    @UseGuards(AuthGuard)
    async findUserShippedOrders(@GetUser() user: UserPayload) {
        UserGuard(user); // Đảm bảo chỉ User mới được gọi hàm này
        
        // Gọi hàm Service để lấy đơn hàng trạng thái SHIPPED
        return this.orderService.findUserOrdersByStatus(user.id, OrderStatus.SHIPPED);
    }
    
    // 3. XÁC NHẬN ĐÃ NHẬN HÀNG (DELIVERED)
    @Patch(':id/confirm-delivery') // PATCH /orders/:id/confirm-delivery
    @UseGuards(AuthGuard) 
    async confirmDelivery(
        @Param('id', ParseIntPipe) id: number,
        @GetUser() user: UserPayload
    ) {
        UserGuard(user); // Chỉ User mới có quyền xác nhận
        
        // Kiểm tra xem đơn hàng có thuộc về User này không (Optional - thường nên có)
        const order = await this.orderService.findOne(id);
        if (!order || order.userId !== user.id) {
            throw new NotFoundException(`Order ID ${id} không tồn tại hoặc không thuộc về bạn.`);
        }
        
        // Chuyển trạng thái sang DELIVERED
        return this.orderService.updateStatus(id, OrderStatus.DELIVERED); 
    }


    // =========================================================
    // ⭐️ PHẦN 2: CÁC ROUTE CHO ADMIN (Xử lý đơn hàng) ⭐️
    // =========================================================
    
    // 4. CHUYỂN SANG PROCESSING (BƯỚC 1 CỦA XỬ LÝ VẬN ĐƠN)
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
        console.log(`   ➡️ Yêu cầu tạo vận đơn thủ công trên GHN/GHTK.`);
        console.log(`   - Tên KH: ${order.customerName}`); 
        console.log(`   - SĐT: ${order.customerPhone}`);
        console.log(`   - Địa chỉ: ${order.shippingAddress}`);
        console.log(`   - Tổng tiền COD: ${order.totalAmount} VNĐ`);
        console.log(`=================================================\n`);

        return { 
            message: 'Đã chuyển sang PROCESSING. Vui lòng tạo vận đơn thủ công.', 
            order 
        };
    }

    // 5. CHUYỂN SANG SHIPPED (Admin xác nhận đã gửi hàng)
    @Patch(':id/ship') // PATCH /orders/:id/ship
    @UseGuards(AuthGuard)
    async shipOrder(
        @Param('id') idStr: string,
        @GetUser() user: UserPayload
    ) {
        const id = safeParseInt(idStr);
        AdminGuard(user);
        return this.orderService.updateStatus(id, OrderStatus.SHIPPED);
    }

    // 6. CHUYỂN SANG DELIVERED (Admin xác nhận đã giao hàng thành công - Thay thế cho User confirm nếu không có phản hồi)
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
    
    // 7. CHUYỂN SANG CANCELLED (Hủy đơn hàng)
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
    
    // 8. Lấy đơn hàng theo User ID (Chỉ Admin dùng)
    @Get('user/:userId') // GET /orders/user/:userId
    @UseGuards(AuthGuard)
    async findUserOrdersById(@Param('userId', ParseIntPipe) userId: number, @GetUser() user: UserPayload) {
        AdminGuard(user);
        return this.orderService.findUserOrders(userId);
    }


    // =========================================================
    // ⭐️ PHẦN 3: CÁC ROUTE CƠ BẢN (Public/Admin) ⭐️
    // =========================================================
    
    // 9. LẤY TẤT CẢ ĐƠN HÀNG (Chủ yếu Admin dùng)
    @Get() // GET /orders
    @UseGuards(AuthGuard)
    async findAll(@GetUser() user: UserPayload): Promise<Order[]> {
        AdminGuard(user);
        return this.orderService.findAll();
    }
    
    // 10. LẤY CHI TIẾT ĐƠN HÀNG
    @Get(':id') // GET /orders/:id
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const order = await this.orderService.findOne(id);
        
        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found.`);
        }
        return order;
    }
    
    // 11. TẠO ĐƠN HÀNG MỚI
    @Post() // POST /orders
    @UseGuards(AuthGuard) 
    async create(
        @Body() createOrderDto: CreateOrderDto,
        @GetUser() user: UserPayload
    ): Promise<Order> {
        return this.orderService.create(createOrderDto, user.id); 
    }
}