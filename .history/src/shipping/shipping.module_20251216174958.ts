// src/shipping/shipping.module.ts
import { Module} from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ShippingService } from './shipping.service';
import { TypeOrmModule } from '@nestjs/typeorm'; // Hoặc PrismaModule nếu bạn dùng Prisma

// Import thêm OrderItem nếu bạn cần truy cập trực tiếp

@Module({
    // Sử dụng HttpModule của NestJS để giao tiếp với API bên ngoài (ví dụ: GHN/GHTK)
    imports: [
        HttpModule, 
        // Import Order Entity để ShippingService có thể lấy dữ liệu đơn hàng
        // Nếu bạn dùng Prisma, hãy inject PrismaService vào ShippingService
        TypeOrmModule.forFeature([Order]) 
    ], 
    providers: [ShippingService],
    exports: [ShippingService], // Xuất Service ra ngoài để OrderModule có thể sử dụng
})
export class ShippingModule {}