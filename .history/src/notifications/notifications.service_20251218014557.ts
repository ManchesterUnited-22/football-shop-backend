import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class NotificationsService {
  // Sử dụng Map để quản lý các "luồng" dữ liệu riêng cho từng User
  private usersData = new Map<number, Subject<any>>();

  // Hàm tạo kết nối SSE cho User
  subscribe(userId: number): Observable<any> {
    // Nếu User chưa có "luồng" riêng, tạo mới một Subject
    if (!this.usersData.has(userId)) {
      this.usersData.set(userId, new Subject<any>());
    }
    
    // Trả về Observable để Controller đẩy xuống Client
    return this.usersData.get(userId).asObservable().pipe(
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
}