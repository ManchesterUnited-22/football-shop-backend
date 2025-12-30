// src/users/dto/update-profile.dto.ts
import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;
  

  // Bạn có thể thêm avatarUrl ở đây nếu sau này làm tính năng upload ảnh
}