// src/order/order.service.ts (Phiên bản Hoàn Chỉnh & Đã Sửa Lỗi)

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto'; 
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { Order, OrderStatus, OrderItem } from '@prisma/client'; 

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

        // XÁC ĐỊNH TRẠNG THÁI VÀ GHI CHÚ
        let initialStatus: OrderStatus;
        let internalNote: string;
        
        if (paymentMethod === 'BANK_TRANSFER') {
            initialStatus = OrderStatus.PENDING; 
            internalNote = "CHUYỂN KHOẢN NGÂN HÀNG: Chờ thanh toán qua QR. Đơn hàng sẽ tự động xác nhận.";
        } else { // 'COD'
            // Chuyển COD sang PENDING (Nếu muốn Admin xử lý) hoặc PROCESSING (Nếu muốn tự động hóa 1 bước)
            initialStatus = OrderStatus.PENDING; 
            internalNote = "THANH TOÁN KHI NHẬN HÀNG (COD): Chờ Admin xử lý.";
        }
        
        const finalNote = note ? `${note} | ${internalNote}` : internalNote;

        // Tạo Đơn hàng và Order Items
        try {
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
    async handlePaymentWebhook(payload: PaymentWebhookDto): Promise<Order> {
        
        const orderIdMatch = payload.description.match(/DONHANG(\d+)/i);
        if (!orderIdMatch) {
            throw new BadRequestException("Mã đơn hàng không tìm thấy trong nội dung chuyển khoản.");
        }

        const orderId = parseInt(orderIdMatch[1], 10);
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        
        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found.`);
        }

        if (order.status !== OrderStatus.PENDING) {
            throw new BadRequestException(`Order ${orderId} đã được xử lý hoặc đã hoàn tất.`);
        }

        if (order.totalAmount > payload.amount) {
            throw new BadRequestException(`Số tiền thanh toán ${payload.amount} không đủ (${order.totalAmount}).`);
        }

        // CẬP NHẬT TRẠNG THÁI (PENDING -> PROCESSING)
        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: { 
                status: OrderStatus.PROCESSING, // CHUYỂN SANG PROCESSING
                updatedAt: new Date(),
                note: `${order.note} | Tự động xác nhận TT - Giao dịch ${payload.transactionCode}.`, 
            },
        });
        
        console.log(`✅ Đơn hàng ${orderId} đã được tự động xác nhận và chuyển sang PROCESSING.`);
        return updatedOrder;
    }

    // =========================================================
    // HÀM QUERY CƠ BẢN (CHO USER VÀ ADMIN)
    // =========================================================

    async findAll(): Promise<Order[]> {
        return this.prisma.order.findMany({
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOne(id: number): Promise<Order | null> {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: { items: true }
        });
        return order;
    }
    
    // Hàm dành cho người dùng xem các đơn hàng của họ (được gọi từ Controller)
    async findUserOrders(userId: number) {
        return this.prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }, 
            include: {
                items: {
                    include: {
                        product: { select: { name: true, images: true } },
                        variant: { select: { sizeValue: true } }
                    }
                }, 
            },
        });
    }

    /**
     * ✅ ĐÃ THÊM: Hàm cho Frontend User lấy danh sách đơn hàng theo trạng thái và User ID
     * Endpoint này đáp ứng yêu cầu GET /orders/user/orders/shipped
     */
    async findUserOrdersByStatus(userId: number, status: OrderStatus | 'SHIPPED'): Promise<Order[]> {
        return this.prisma.order.findMany({
            where: { 
                userId, // Lọc theo ID của người dùng đang đăng nhập
                status, // Lọc theo trạng thái yêu cầu (ví dụ: 'SHIPPED')
            },
            orderBy: { createdAt: 'desc' }, 
            include: {
                items: {
                    include: {
                        product: { select: { name: true, images: true } },
                        variant: { select: { sizeValue: true } }
                    }
                }, 
            },
        });
    }

    // =========================================================
    // HÀM QUẢN LÝ TRẠNG THÁI (CHO ADMIN)
    // =========================================================
    
    /**
     * Hàm trợ giúp chung để cập nhật trạng thái đơn hàng. 
     * Đã thay thế updateOrderStatus để giải quyết Lỗi 2551.
     */
    async updateStatus(id: number, newStatus: OrderStatus) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found.`);
        }
        
        if (order.status === OrderStatus.CANCELLED) {
            throw new BadRequestException(`Order ${id} is already cancelled and cannot be updated.`);
        }

        const updatedOrder = await this.prisma.order.update({
            where: { id },
            data: { 
                status: newStatus,
                updatedAt: new Date(),
            },
        });
        
        if (newStatus === OrderStatus.DELIVERED) {
            console.log(`Order ${id} marked as DELIVERED. Sales report updated.`);
        }
        
        return updatedOrder;
    }


    /**
     * Chuyển trạng thái sang PROCESSING (Admin Step 1)
     * Trả về Order đầy đủ để Controller có thể LOG thông tin khách hàng
     */
    async processOrder(orderId: number): Promise<Order> {
        // 1. Cập nhật trạng thái (Đã sửa lỗi gọi hàm)
        const processedOrder = await this.updateStatus(orderId, OrderStatus.PROCESSING); 
        
        // 2. Trả về Order đầy đủ
        return processedOrder; 
    }

    // ❌ ĐÃ XÓA: Hàm updateShippingInfo không còn cần thiết do loại bỏ nhập mã vận đơn thủ công.
    
    // Các hàm chuyển trạng thái còn lại (Đã sửa lỗi gọi hàm)
    async shipOrder(orderId: number): Promise<Order> {
        return this.updateStatus(orderId, OrderStatus.SHIPPED);
    }
    
    async deliverOrder(orderId: number): Promise<Order> {
        return this.updateStatus(orderId, OrderStatus.DELIVERED);
    }

    async cancelOrder(orderId: number): Promise<Order> {
        return this.updateStatus(orderId, OrderStatus.CANCELLED);
    }
}