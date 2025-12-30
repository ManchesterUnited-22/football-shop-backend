import { Controller, Sse, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Observable } from 'rxjs';
import { AuthGuard } from '../auth/auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('sse')
  @UseGuards(AuthGuard)
  sse(@GetUser() user: any): Observable<any> {
    // ⭐️ QUAN TRỌNG: Truyền cả id và role để fix lỗi "Expected 2 arguments"
    // Đảm bảo user.role tồn tại trong Token của bạn
    return this.notificationsService.subscribe(user.id, user.role);
  }
}