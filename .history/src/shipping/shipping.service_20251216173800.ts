// src/shipping/shipping.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Order, OrderItem } from '@prisma/client'; 
import { firstValueFrom } from 'rxjs'; 
import { AxiosResponse } from 'axios';

@Injectable()
export class ShippingService {
    private readonly API_BASE_URL = process.env.SHIPPING_API_URL || 'https://dev-online-gateway.ghn.vn/shipper-service'; 
    private readonly SHOP_ID = process.env.GHN_SHOP_ID;
    private readonly TOKEN = process.env.GHN_TOKEN;
    
    constructor(private readonly httpService: HttpService) {}

    /**
     * Tạo vận đơn với GHN
     * Nhận vào Order có items kèm product (từ findOneWithDetails)
     */
    async createShippingLabel(
        order: Order & { items: (OrderItem & { product: { name: string } })[] }
    ): Promise<{ trackingCode: string; labelUrl: string }> {
        
        const payload = {
            from_name: "Tên Shop Của Bạn",
            from_phone: "0901234567",
            from_address: "Địa chỉ Shop/Kho hàng",
            from_ward_name: "Tên Phường/Xã Shop",
            from_district_name: "Tên Quận/Huyện Shop",
            from_province_name: "Tên Tỉnh/Thành Shop",
            
            to_name: order.customerName,
            to_phone: order.customerPhone,
            to_address: order.shippingAddress,
            to_ward_name: "Tên Phường/Xã Khách", 
            to_district_name: "Tên Quận/Huyện Khách",
            to_province_name: "Tên Tỉnh/Thành Khách",

            cod_amount: order.paymentMethod === 'COD' ? order.totalAmount : 0,
            weight: 500,
            service_type_id: 2, 
            required_note: "KHONG_CHO_XEM_HANG",
            client_order_code: order.id.toString(), 
            
            items: order.items.map(item => ({ 
                name: item.product?.name || 'Sản phẩm', 
                code: item.productId.toString(), 
                quantity: item.quantity,
                price: item.priceAtPurchase, 
            }))
        };
        
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
