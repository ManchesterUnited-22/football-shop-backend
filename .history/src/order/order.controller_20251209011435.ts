// src/order/order.controller.ts

import { Controller, Post, Body, UsePipes, ValidationPipe, Get, Param, ParseIntPipe, NotFoundException, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard'; 
import { GetUser } from '../auth/decorators/get-user.decorator';
// Import UseGuards từ @nestjs/common để sử dụng decorator này

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

  @Post()
  // ⭐️ 1. BẢO VỆ ENDPOINT BẰNG GUARD ⭐️
  @UseGuards(AuthGuard) 
  async create(
    @Body() createOrderDto: CreateOrderDto,
    // ⭐️ 2. SỬ DỤNG DECORATOR ĐỂ LẤY USER ID ⭐️
    @GetUser() user: UserPayload // Lấy đối tượng user đã được Passport gắn vào request
  ): Promise<Order> {
    // ⭐️ 3. TRUYỀN USER ID VÀO SERVICE ⭐️
    return this.orderService.create(createOrderDto, user.id); 
  }

  @Get()
  async findAll(): Promise<Order[]> {
    // Lưu ý: Endpoint này không được bảo vệ. Chỉ nên dùng cho mục đích Admin/Test.
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

    // ⭐️ 4. ENDPOINT MỚI, BẢO MẬT: Lấy đơn hàng của người đang đăng nhập ⭐️
    @Get('me') // Frontend sẽ gọi GET /orders/me
    @UseGuards(AuthGuard)
    async findMyOrders(@GetUser() user: UserPayload) {
        // Truyền ID lấy từ token vào service
        return this.orderService.findUserOrders(user.id);
    }
    
    // ⭐️ Endpoint cũ (giữ lại nếu cần cho admin/test, nhưng không còn dùng ở frontend) ⭐️
    @Get('user/:userId') 
    async findUserOrders(@Param('userId', ParseIntPipe) userId: number) {
        return this.orderService.findUserOrders(userId);
    }
}