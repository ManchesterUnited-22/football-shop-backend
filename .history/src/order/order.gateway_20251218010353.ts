// src/order/order.gateway.ts
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' }, // thay bằng domain frontend của bạn khi triển khai
})
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log('Socket connected:', client.id);
  }

  handleDisconnect(client: any) {
    console.log('Socket disconnected:', client.id);
  }

  // Sẽ dùng ở bước sau để phát sự kiện theo user
  notifyOrderStatusToAll(payload: any) {
    this.server.emit('orderStatusChanged', payload);
  }
}
