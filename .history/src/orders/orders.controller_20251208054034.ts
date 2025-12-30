// src/orders/orders.controller.ts

import { Controller, Post, Body, UsePipes, ValidationPipe, Get } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './schemas/order.schema';

@Controller('orders')
// Sử dụng ValidationPipe để tự động validate DTO
@UsePipes(new ValidationPipe({ transform: true })) 
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    // Gọi service để xử lý logic tạo đơn hàng
    return this.ordersService.create(createOrderDto);
  }

  @Get()
  // Endpoint này sẽ dùng cho Admin hoặc lấy lịch sử đơn hàng của User (cần thêm Auth Guard)
  async findAll(): Promise<Order[]> {
    return this.ordersService.findAll();
  }
}