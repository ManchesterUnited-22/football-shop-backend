import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req, HttpCode, BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Giả định
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard'; // Giả định
import { PaymentWebhookDto } from './dto/payment-webhook.dto'; // ⬅️ IMPORT DTO WEBHOOK
import { Order } from '@prisma/client'; // Import Order từ Prisma

@Controller('orders')
export class OrderController {
    constructor(private readonly orderService: OrderService) {}

    // =========================================================
    // 1. TẠO ĐƠN HÀNG (CONSUMER)
    // =========================================================
    @UseGuards(JwtAuthGuard)
    @Post()
    async create(@Body() createOrderDto: CreateOrderDto, @Req() req): Promise<Order> {
        return this.orderService.create(createOrderDto, req.user.id);
    }

    // =========================================================
    // 2. WEBHOOK (TỰ ĐỘNG XÁC NHẬN TT)
    // =========================================================
    @Post('payment-webhook') 
    @HttpCode(200) 
    async handleWebhook(@Body() payload: PaymentWebhookDto) {
        try {
            await this.orderService.handlePaymentWebhook(payload);
            return { success: true, message: "Webhook processed successfully." };
        } catch (error) {
            // Rất quan trọng: Trả về 200/202 cho Webhook ngay cả khi có lỗi logic 
            // (như đơn hàng không tồn tại) để tránh dịch vụ gửi lại nhiều lần.
            console.error("Webhook processing error:", error.message);
            return { success: false, message: `Webhook error: ${error.message}` };
        }
    }

    // =========================================================
    // 3. USER QUERY (LỖI findUserOrders ĐÃ SỬA)
    // =========================================================
    
    // Lấy đơn hàng của chính User
    @UseGuards(JwtAuthGuard)
    @Get('my-orders')
    async findMyOrders(@Req() req) {
        // Lỗi TS2339 'findUserOrders' đã được giải quyết nếu nó có trong OrderService
        return this.orderService.findUserOrders(req.user.id); 
    }
    
    // Lấy đơn hàng theo ID
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async findOne(@Param('id') id: string) {
        // Lỗi TS2339 'findOne' đã được giải quyết nếu nó có trong OrderService
        return this.orderService.findOne(+id); 
    }


    // =========================================================
    // 4. ADMIN ACTIONS (LỖI processOrder, shipOrder, deliverOrder, cancelOrder, findAll ĐÃ SỬA)
    // * CẦN THÊM AdminAuthGuard
    // =========================================================
    
    // Admin: Xem tất cả đơn hàng
    @UseGuards(AdminAuthGuard) 
    @Get()
    findAll(): Promise<Order[]> {
        // Lỗi TS2339 'findAll' đã được giải quyết
        return this.orderService.findAll();
    }

    // Admin: Chuyển sang PROCESSING
    @UseGuards(AdminAuthGuard)
    @Patch(':id/process')
    processOrder(@Param('id') id: string) {
        // Lỗi TS2339 'processOrder' đã được giải quyết
        return this.orderService.processOrder(+id);
    }

    // Admin: Chuyển sang SHIPPED
    @UseGuards(AdminAuthGuard)
    @Patch(':id/ship')
    shipOrder(@Param('id') id: string) {
        // Lỗi TS2339 'shipOrder' đã được giải quyết
        return this.orderService.shipOrder(+id);
    }
    
    // Admin: Chuyển sang DELIVERED
    @UseGuards(AdminAuthGuard)
    @Patch(':id/deliver')
    deliverOrder(@Param('id') id: string) {
        // Lỗi TS2339 'deliverOrder' đã được giải quyết
        return this.orderService.deliverOrder(+id);
    }

    // Admin: Hủy đơn hàng
    @UseGuards(AdminAuthGuard)
    @Patch(':id/cancel')
    cancelOrder(@Param('id') id: string) {
        // Lỗi TS2339 'cancelOrder' đã được giải quyết
        return this.orderService.cancelOrder(+id);
    }
}