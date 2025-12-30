import { SetMetadata } from '@nestjs/common';

// Key metadata được sử dụng để lưu trữ thông tin role trong metadata của route
export const ROLES_KEY = 'roles';

/**
 * Decorator Roles: Gán yêu cầu về vai trò (role) vào metadata của route handler.
 * Các RolesGuard sẽ sử dụng metadata này để kiểm tra quyền truy cập.
 * * @param roles Danh sách các chuỗi role được phép truy cập (ví dụ: 'admin', 'customer')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);