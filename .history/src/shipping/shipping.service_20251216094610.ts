// src/shipping/shipping.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';

// Import Order và OrderItem từ Prisma Client nếu bạn có
import { Order, OrderItem } from '@prisma/client'; 
import { firstValueFrom } from 'rxjs'; 
import { AxiosResponse } from 'axios'; // Đảm bảo bạn đã import AxiosResponse

@Injectable()
export class ShippingService {
    // Thông tin cấu hình (Nên load từ config service hoặc biến môi trường)
    private readonly API_BASE_URL = process.env.SHIPPING_API_URL || 'https://dev-online-gateway.ghn.vn/shipper-service'; 
    private readonly SHOP_ID = process.env.GHN_SHOP_ID;
    private readonly TOKEN = process.env.GHN_TOKEN;

    constructor(private readonly httpService: HttpService) {}

    /**
     * Hàm chính: Tạo vận đơn với bên Vận chuyển
     * * ✅ ĐIỂM SỬA CHỮA QUAN TRỌNG: Ép kiểu đầu vào (Order & { items: OrderItem[] })
     * Để khớp với kiểu dữ liệu trả về từ findOneWithDetails trong OrderService.
     */
    async createShippingLabel(order: Order & { items: OrderItem[] }): Promise<{ trackingCode: string; labelUrl: string }> {
        // --- 1. CHUẨN BỊ PAYLOAD (Cấu trúc GHN/GHTK) ---

        const payload = {
            // Thông tin Shop (người gửi)
            "from_name": "Tên Shop Của Bạn",
            "from_phone": "0901234567",
            "from_address": "Địa chỉ Shop/Kho hàng",
            "from_ward_name": "Tên Phường/Xã Shop",
            "from_district_name": "Tên Quận/Huyện Shop",
            "from_province_name": "Tên Tỉnh/Thành Shop",
            
            // Thông tin Khách hàng (người nhận)
            "to_name": order.customerName,
            "to_phone": order.customerPhone,
            "to_address": order.shippingAddress,
            // (Lưu ý: Bạn cần tách các trường Phường/Quận/Tỉnh từ order.shippingAddress 
            // nếu bạn không lưu riêng chúng trong DB)
            "to_ward_name": "Tên Phường/Xã Khách", 
            "to_district_name": "Tên Quận/Huyện Khách",
            "to_province_name": "Tên Tỉnh/Thành Khách",

            // Thông tin Đơn hàng
            "cod_amount": order.paymentMethod === 'COD' ? order.totalAmount : 0,
            "weight": 500, // Trọng lượng ước tính (gram)
            "service_type_id": 2, 
            "required_note": "KHONG_CHO_XEM_HANG",
            "client_order_code": order.id.toString(), 
            
            // Thông tin chi tiết Items
            "items": order.items.map(item => ({ // ✅ Dùng order.items (Tên quan hệ trong Prisma)
                "name": item.productName || 'Sản phẩm', // Cần có tên sản phẩm
                "code": item.productId.toString(), 
                "quantity": item.quantity,
                "price": item.priceAtPurchase, // Dùng priceAtPurchase
            }))
        };
        
        // --- 2. THỰC HIỆN GỌI API ---
        try {
            const response: AxiosResponse<any> = await firstValueFrom(
                this.httpService.post(
                    `${this.API_BASE_URL}/v2/shipping-order/create`,
                    payload,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Token': this.TOKEN,
                            'ShopId': this.SHOP_ID,
                        },
                    },
                ),
            );

            if (response.data.code !== 200) {
                throw new Error(response.data.message || 'Lỗi không xác định từ API Vận chuyển.');
            }

            // --- 3. TRẢ VỀ KẾT QUẢ ---
            return {
                trackingCode: response.data.data.order_code, 
                labelUrl: response.data.data.qr_code_full, 
            };
        } catch (error) {
            console.error('Lỗi khi tạo vận đơn:', error.message);
            throw new InternalServerErrorException(
                `Không thể tạo vận đơn: ${error.message || 'Lỗi kết nối API vận chuyển'}`,
            );
        }
    }
}