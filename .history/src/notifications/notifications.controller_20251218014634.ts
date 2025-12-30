import { Controller, Sse, UseGuards, Query, MessageEvent } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Observable } from 'rxjs';
import { AuthGuard } from '../auth/auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('sse') // Endpoint: /notifications/sse
  @UseGuards(AuthGuard) // Bảo mật: Chỉ User đã đăng nhập mới kết nối được
  sse(@GetUser() user: any): Observable<MessageEvent> {
    // Trả về luồng dữ liệu dành riêng cho User ID này
    return this.notificationsService.subscribe(user.id);
  }
}