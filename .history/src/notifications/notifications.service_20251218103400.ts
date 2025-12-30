import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Subject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface UserConnection {
  subject: Subject<any>;
  role: string;
}

@Injectable()
export class NotificationsService {
  // ⭐️ Cải tiến: Lưu cả Subject và Role của User
  private connections = new Map<number, UserConnection>();

  /**
   * Thiết lập kết nối SSE
   * @param userId ID của người dùng
   * @param role Vai trò (ADMIN hoặc USER) lấy từ Token
   */
  subscribe(userId: number, role: string): Observable<any> {
    let connection = this.connections.get(userId);

    if (!connection) {
      connection = {
        subject: new Subject<any>(),
        role: role.toUpperCase(), // Đảm bảo luôn là viết hoa
      };
      this.connections.set(userId, connection);
    } else {
      // Cập nhật lại role nếu có thay đổi
      connection.role = role.toUpperCase();
    }

    console.log(`📡 User ${userId} (${role}) đã kết nối SSE`);

    return connection.subject.asObservable().pipe(
      map((data) => ({ data }))
    );
  }

  /**
   * Hàm bổ trợ: Gửi thông báo cho tất cả người dùng thuộc một Role cụ thể
   */
  private sendToRoles(role: string, payload: any) {
    const targetRole = role.toUpperCase();
    
    this.connections.forEach((connection, userId) => {
      if (connection.role === targetRole) {
        connection.subject.next(payload);
      }
    });
  }

  // =========================================================
  // 1. THÔNG BÁO CHO USER: Khi đơn hàng được giao (Shipped)
  // =========================================================
  @OnEvent('order.shipped')
  handleOrderShippedEvent(payload: any) {
    const { userId, orderId, message } = payload;
    
    const connection = this.connections.get(userId);
    if (connection) {
      connection.subject.next({
        type: 'ORDER_SHIPPED',
        orderId,
        message,
      });
    }
  }

  // =========================================================
  // 2. THÔNG BÁO CHO ADMIN: Khi có đơn hàng mới (Created)
  // =========================================================
  @OnEvent('order.created')
  handleOrderCreatedEvent(order: any) {
    console.log(`🔔 Đang gửi thông báo đơn hàng mới #${order.id} cho các Admin...`);
    
    this.sendToRoles('ADMIN', {
      type: 'NEW_ORDER',
      message: `🔔 Có đơn hàng mới #${order.id}!`,
      order: {
        id: order.id,
        customerName: order.customerName || 'Khách hàng',
        totalAmount: order.totalAmount,
        createdAt: order.createdAt
      }
    });
  }

  /**
   * Xử lý khi User ngắt kết nối (Tùy chọn - Giúp dọn dẹp bộ nhớ)
   */
  removeConnection(userId: number) {
    this.connections.delete(userId);
  }
}