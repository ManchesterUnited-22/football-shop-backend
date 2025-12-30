// src/shipping/shipping.service.ts (Đã dọn dẹp theo Phương án Bán Tự động)

import { Injectable } from '@nestjs/common';
// ❌ ĐÃ XÓA: Loại bỏ các imports không cần thiết cho việc gọi API GHN
// import { HttpService } from '@nestjs/axios';
// import { firstValueFrom } from 'rxjs'; 
// import { AxiosResponse } from 'axios';
// import { Order, OrderItem } from '@prisma/client'; 

@Injectable()
export class ShippingService {
    // ❌ ĐÃ XÓA: Loại bỏ các biến môi trường và URL API
    // private readonly API_BASE_URL = process.env.SHIPPING_API_URL || 'https://dev-online-gateway.ghn.vn/shipper-service'; 
    // private readonly SHOP_ID = process.env.GHN_SHOP_ID;
    // private readonly TOKEN = process.env.GHN_TOKEN;
    
    // ❌ ĐÃ XÓA: Loại bỏ dependency HttpService
    constructor(/* private readonly httpService: HttpService */) {}

    /**
     * TẠM THỜI VÔ HIỆU HÓA HOẶC XÓA BỎ HÀM NÀY
     * Chức năng tạo vận đơn tự động đã bị loại bỏ theo Phương án 1 (Bán Tự động).
     * Hàm này được giữ lại ở dạng trống nếu bạn muốn tái sử dụng tên hàm sau này.
     */
    /* async createShippingLabel(
        order: Order & { items: (OrderItem & { product: { name: string } })[] } 
    ): Promise<{ trackingCode: string; labelUrl: string }> {
        // Toàn bộ logic API đã bị xóa.
        throw new Error("Chức năng tạo vận đơn tự động đã bị vô hiệu hóa.");
    }
    */
    
    // Giả sử có các hàm tiện ích khác (nếu có)
}