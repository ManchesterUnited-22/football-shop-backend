// src/order/order.gateway.ts
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Order } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: '*', // hoặc domain frontend của bạn
  },
})
export class OrderGateway {
  @WebSocketServer()
  server: Server;

  // Hàm emit khi trạng thái đơn hàng thay đổi
  notifyOrderStatus(order: Order) {
    this.server.emit('orderStatusChanged', order);
  }
}
