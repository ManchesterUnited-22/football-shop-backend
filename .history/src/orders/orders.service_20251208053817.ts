// src/orders/orders.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto'; // Cần tạo DTO này

@Injectable()
export class OrdersService {
  constructor(
    // Inject Model Order để thao tác với database
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    
    // **Bước 1: Validation và Tính toán bảo mật**
    // Trong thực tế, bạn sẽ gọi ProductsService để lấy giá thực tế 
    // của từng item để tính lại totalAmount, ngăn chặn giả mạo giá.
    
    const calculatedSubtotal = createOrderDto.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0,
    );
    
    // Kiểm tra tổng tiền
    if (calculatedSubtotal !== createOrderDto.subtotal) {
        throw new BadRequestException('Giá trị đơn hàng không hợp lệ. Vui lòng kiểm tra lại.');
    }
    
    // Tạo đối tượng đơn hàng với trạng thái Pending ban đầu
    const createdOrder = new this.orderModel({
      ...createOrderDto,
      totalAmount: calculatedSubtotal + createOrderDto.shippingFee,
      status: 'Pending',
    });
    
    // **Bước 2: Lưu vào Database**
    return createdOrder.save();
  }

  // Phương thức để lấy lịch sử đơn hàng của người dùng (sẽ dùng sau)
  async findAll(): Promise<Order[]> {
    return this.orderModel.find().exec(); 
  }
}