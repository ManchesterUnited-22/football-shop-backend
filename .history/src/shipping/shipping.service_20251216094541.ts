// src/shipping/shipping.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { Order } from '../order/entities/order.entity'; // Đảm bảo đường dẫn đúng
import { firstValueFrom } from 'rxjs'; // Dùng cho HttpService của NestJS
import { AxiosResponse } from 'axios';

@Injectable()
export class ShippingService {
    // Thông tin cấu hình (Nên load từ config service hoặc biến môi trường)
    private readonly API_BASE_URL = process.env.SHIPPING_API_URL || 'https://dev-online-gateway.ghn.vn/shipper-service'; 
    private readonly SHOP_ID = process.env.GHN_SHOP_ID;
    private readonly TOKEN = process.env.GHN_TOKEN;

    constructor(private readonly httpService: HttpService) {}

    /**
     * Hàm chính: Tạo vận đơn với bên Vận chuyển
     * @param order: Chi tiết đơn hàng từ database (đã có OrderItems)
     * @returns { trackingCode: string, labelUrl: string }
     */
    async createShippingLabel(order: Order & { items: OrderItem[] }): Promise<{ trackingCode: string; labelUrl: string }>

        // Ví dụ cho GHN (Giao Hàng Nhanh):
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
            "to_ward_name": "Tên Phường/Xã Khách", // Cần tách từ order.shippingAddress (thường cần helper function)
            "to_district_name": "Tên Quận/Huyện Khách",
            "to_province_name": "Tên Tỉnh/Thành Khách",

            // Thông tin Đơn hàng
            "cod_amount": order.paymentMethod === 'COD' ? order.totalAmount : 0,
            "weight": 500, // Trọng lượng ước tính (gram), cần tính từ OrderItems
            "service_type_id": 2, // Dịch vụ giao hàng tiêu chuẩn
            "required_note": "KHONG_CHO_XEM_HANG",
            "client_order_code": order.id.toString(), // ID đơn hàng của bạn
            
            // Thông tin chi tiết Items
            "items": order.orderItems.map(item => ({
                "name": item.productName,
                "code": item.productId.toString(), 
                "quantity": item.quantity,
                "price": item.price,
                // "weight": ... (Nếu bạn lưu trọng lượng riêng cho từng item)
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

            // Kiểm tra kết quả từ API Vận chuyển (Ví dụ: GHN dùng code 200)
            if (response.data.code !== 200) {
                throw new Error(response.data.message || 'Lỗi không xác định từ API Vận chuyển.');
            }

            // --- 3. TRẢ VỀ KẾT QUẢ ---
            return {
                trackingCode: response.data.data.order_code, // Mã vận đơn từ GHN
                labelUrl: response.data.data.qr_code_full, // URL in mã vạch/phiếu
            };
        } catch (error) {
            console.error('Lỗi khi tạo vận đơn:', error.message);
            throw new InternalServerErrorException(
                `Không thể tạo vận đơn: ${error.message || 'Lỗi kết nối API vận chuyển'}`,
            );
        }
    }
}
