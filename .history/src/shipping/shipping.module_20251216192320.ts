// src/shipping/shipping.module.ts (Đã dọn dẹp theo Phương án Bán Tự động)

import { Module} from '@nestjs/common';
// ❌ ĐÃ XÓA: HttpModule không còn cần thiết vì ShippingService đã xóa logic gọi API
// import { HttpModule } from '@nestjs/axios'; 
import { ShippingService } from './shipping.service';

@Module({
    // ✅ ĐÃ SỬA: Loại bỏ HttpModule
    imports: [
        // HttpModule, 
    ], 
    // Vẫn giữ ShippingService để tránh lỗi nếu có module khác (chưa được dọn dẹp) cố gắng inject nó.
    providers: [ShippingService],
    exports: [ShippingService], 
})
export class ShippingModule {}