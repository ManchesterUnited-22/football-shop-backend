// src/order/order.controller.ts

import { Controller, Post, Body, UsePipes, ValidationPipe, Get, Param, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard'; 
import { GetUser } from '../auth/decorators/get-user.decorator';

// Giả định cấu trúc Payload từ token JWT
interface UserPayload {
    id: number;
    email: string;
    role: string;
}

@Controller('orders') // Endpoint sẽ là POST/GET /orders
@UsePipes(new ValidationPipe({ transform: true })) 
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // --- START: CÁC ROUTE CỤ THỂ HOẶC CÓ CHUỖI CỐ ĐỊNH ---

  // ⭐️ FIX LỖI: DI CHUYỂN /me LÊN TRÊN CÙNG ⭐️
  // 1. ENDPOINT BẢO MẬT: Lấy đơn hàng của người đang đăng nhập
  @Get('me') // Frontend sẽ gọi GET /orders/me
  @UseGuards(AuthGuard)
  async findMyOrders(@GetUser() user: UserPayload) {
        // Truyền ID lấy từ token vào service
        return this.orderService.findUserOrders(user.id);
  }
  
  // 2. Endpoint cũ (cũng nên đặt trước :id)
  @Get('user/:userId') 
  async findUserOrders(@Param('userId', ParseIntPipe) userId: number) {
        return this.orderService.findUserOrders(userId);
  }
  
  // --- END: CÁC ROUTE CỤ THỂ HOẶC CÓ CHUỖI CỐ ĐỊNH ---


  // --- START: CÁC ROUTE CHUNG VÀ CÓ THAM SỐ ĐỘNG CUỐI CÙNG ---

  @Get()
  async findAll(): Promise<Order[]> {
        return this.orderService.findAll();
  }
  
  // 3. ROUTE CÓ THAM SỐ ĐỘNG (:id) ĐẶT CUỐI CÙNG
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