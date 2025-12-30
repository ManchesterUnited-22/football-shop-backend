import { Controller, Post, Body, Req, UseGuards, BadRequestException,Get,Param } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthGuard } from 'src/auth/auth.guard'; // Giả sử bạn dùng AuthGuard để xác thực

@Controller('orders')
@UseGuards(AuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ===========================
  // TẠO ĐƠN HÀNG MỚI (Backend của nút Thanh toán)
  // Endpoint: POST /orders
  // ===========================
  @Post()
  @UseGuards(AuthGuard) // Chỉ người dùng đã đăng nhập mới được tạo đơn
  async create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    // Lấy userId từ token/session sau khi qua AuthGuard
    const userId = req.user?.id; 
    
    if (!userId) {
      // Trường hợp này hiếm xảy ra nếu AuthGuard hoạt động đúng
      throw new BadRequestException('User not authenticated.'); 
    }

    // Gọi Service để xử lý tạo đơn hàng
    return this.orderService.createOrder(Number(userId), createOrderDto);
  }
  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user?.id;
    return this.orderService.findAllOrders(Number(userId));
  }
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.orderService.findOneOrder(Number(userId), Number(id));
  }
}