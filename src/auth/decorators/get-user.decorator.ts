import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom Decorator để trích xuất đối tượng user đã được gắn vào Request 
 * sau khi JWT Guard và Strategy xác thực thành công.
 * Đối tượng user này chứa payload từ token (ví dụ: { id, email, role }).
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Trả về đối tượng user được gắn vào request bởi JwtStrategy
    return request.user; 
  },
);