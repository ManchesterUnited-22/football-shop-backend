import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto'; 
import { PaymentWebhookDto } from '../dto/payment-webhook.dto'; // ⬅️ Cần đảm bảo file này tồn tại
import { Order, OrderStatus } from '@prisma/client'; 

@Injectable()
export class OrderService {
    constructor(
        private prisma: PrismaService,
    ) {}
    
    // =========================================================
    // HÀM TẠO ĐƠN HÀNG (CREATE)
    // =========================================================
    async create(createOrderDto: CreateOrderDto, userId: number): Promise<Order> {
        
        const SHIPPING_FEE = 30000; 
        
        const { paymentMethod, items, note, status, userId: dtoUserId, ...orderHeaderData } = createOrderDto;

        const subtotal = items.reduce(
            (sum, item) => sum + (item.priceAtPurchase * item.quantity),
            0,
        );
        
        const calculatedTotalAmount = subtotal + SHIPPING_FEE;
        
        if (Math.abs(calculatedTotalAmount - orderHeaderData.totalAmount) > 0.01) {
            throw new BadRequestException('Tổng số tiền đơn hàng không khớp với tính toán.');
        }

        // 3. XÁC ĐỊNH TRẠNG THÁI VÀ GHI CHÚ
        let initialStatus: OrderStatus;
        let internalNote: string;
        
        if (paymentMethod === 'BANK_TRANSFER') {
            initialStatus = OrderStatus.PENDING; 
            internalNote = "CHUYỂN KHOẢN NGÂN HÀNG: Chờ thanh toán qua QR. Đơn hàng sẽ tự động xác nhận.";
        } else { // 'COD'
            // ⬅️ ĐÃ SỬA: Chuyển COD sang PROCESSING
            initialStatus = OrderStatus.PROCESSING; 
            internalNote = "THANH TOÁN KHI NHẬN HÀNG (COD): Bắt đầu xử lý.";
        }
        
        const finalNote = note ? `${note} | ${internalNote}` : internalNote;

        // 4. Tạo Đơn hàng và Order Items
        try {
            // ... (Giữ nguyên logic tạo đơn hàng)
            const newOrder = await this.prisma.order.create({
                data: {
                    ...orderHeaderData, 
                    userId: userId, 
                    totalAmount: calculatedTotalAmount,
                    status: initialStatus,
                    note: finalNote, 
                    items: {
                        createMany: {
                            data: items.map(item => ({
                                productId: item.productId,
                                variantId: item.variantId,
                                quantity: item.quantity,
                                priceAtPurchase: item.priceAtPurchase,
                            })),
                        },
                    },
                },
                include: {
                    items: true,
                },
            });

            return newOrder;
        } catch (error) {
            console.error("Error creating order:", error);
            throw new BadRequestException("Failed to create order due to server error.");
        }
    }
    
    // =========================================================
    // HÀM XỬ LÝ WEBHOOK (TỰ ĐỘNG XÁC NHẬN)
    // =========================================================
    /**
     * Xử lý Webhook thanh toán gửi đến từ dịch vụ trung gian.
     * @param payload Dữ liệu Webhook chứa thông tin giao dịch.
     * @returns Đơn hàng đã được cập nhật
     */
    async handlePaymentWebhook(payload: PaymentWebhookDto): Promise<Order> {
        
        // 1. PHÂN TÍCH NỘI DUNG VÀ TÌM ORDER ID
        const orderIdMatch = payload.description.match(/DONHANG(\d+)/i);
        if (!orderIdMatch) {
            // Trả về lỗi 400 hoặc đơn giản là return để không xử lý giao dịch không liên quan
            throw new BadRequestException("Mã đơn hàng không tìm thấy trong nội dung chuyển khoản.");
        }

        const orderId = parseInt(orderIdMatch[1], 10);

        // 2. TÌM ĐƠN HÀNG & KIỂM TRA
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        
        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found.`);
        }

        // Yêu cầu 1: Phải là đơn hàng PENDING
        if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException(`Order ${orderId} đã được xử lý hoặc đã hoàn tất.`);
        }

        // Yêu cầu 2: Kiểm tra số tiền
        if (order.totalAmount > payload.amount) {
            throw new BadRequestException(`Số tiền thanh toán ${payload.amount} không đủ (${order.totalAmount}).`);
        }

        // 3. CẬP NHẬT TRẠNG THÁI (PENDING -> SHIPPED theo yêu cầu)
        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: { 
                status: OrderStatus.SHIPPED, // ⬅️ CHUYỂN THẲNG SANG SHIPPED
                updatedAt: new Date(),
                note: `${order.note} | Tự động xác nhận TT - Giao dịch ${payload.transactionCode}.`, 
            },
        });
        
        // Log để theo dõi
        console.log(`✅ Đơn hàng ${orderId} đã được tự động xác nhận và chuyển sang SHIPPED.`);

        return updatedOrder;
    }

    // =========================================================
    // CÁC HÀM CÒN LẠI (GIỮ NGUYÊN)
    // =========================================================
    
    // ... (findAll, findOne, findUserOrders, updateOrderStatus, processOrder, shipOrder, deliverOrder, cancelOrder)
    // ... (Giữ nguyên các hàm này)
}