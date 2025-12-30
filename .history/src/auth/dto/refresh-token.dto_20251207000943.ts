import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token phải là chuỗi hợp lệ' })
  refreshToken: string;
}