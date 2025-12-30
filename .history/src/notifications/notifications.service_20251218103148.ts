import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class NotificationsService {
  // Sử dụng Map để quản lý các "luồng" dữ liệu riêng cho từng User
  private usersData = new Map<number, Subject<any>>();

  // Hàm tạo kết nối SSE cho User
 // Hàm tạo kết nối SSE cho User
  subscribe(userId: number): Observable<any> {
    // 1. Lấy Subject ra một biến tạm
    let userSubject = this.usersData.get(userId);
    
    // 2. Nếu chưa có, tạo mới và lưu vào Map
    if (!userSubject) {
      userSubject = new Subject<any>();
      this.usersData.set(userId, userSubject);
    }
    
    // 3. Bây giờ TypeScript đã chắc chắn userSubject không phải undefined
    return userSubject.asObservable().pipe(
      map((data) => ({ data }))
    );
  }

  // Lắng nghe sự kiện từ OrderService
  @OnEvent('order.shipped')
  handleOrderShippedEvent(payload: any) {
    const { userId, orderId, message } = payload;
    
    // Tìm "luồng" của User này và đẩy dữ liệu vào
    const userSubject = this.usersData.get(userId);
    if (userSubject) {
      userSubject.next({
        type: 'ORDER_SHIPPED',
        orderId,
        message,
      });
    }
  }
  // Trong notifications.service.ts (Backend)
@OnEvent('order.created')
handleOrderCreatedEvent(order: any) {
    // Gửi thông báo đến TẤT CẢ các Admin đang kết nối
    this.sendToRoles('ADMIN', {
        type: 'NEW_ORDER',
        message: `🔔 Có đơn hàng mới #${order.id}!`,
        order: order
    });
}
}