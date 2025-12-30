// src/order/order.controller.ts

import { Controller, Post, Body, UsePipes, ValidationPipe, Get, Param, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from '@prisma/client';

@Controller('orders') // Endpoint sẽ là POST/GET /orders
@UsePipes(new ValidationPipe({ transform: true })) 
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    // Gọi service để xử lý logic tạo đơn hàng và lưu DB
    return this.orderService.create(createOrderDto);
  }

  @Get()
  async findAll(): Promise<Order[]> {
    // Trả về tất cả đơn hàng (Admin/Test)
    // Cần thêm Auth Guard và lọc theo User ID nếu dùng cho User
    return this.orderService.findAll();
  }
  @Get(':id') // 👈 ENDPOINT MỚI
    async findOne(@Param('id', ParseIntPipe) id: number) {
        const order = await this.orderService.findOne(id);
        
        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found.`);
        }
        return order;
    }

    
    
}