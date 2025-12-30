import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto'; 
import { PaymentWebhookDto } from './dto/payment-webhook.dto'; // ⬅️ Đảm bảo đường dẫn này đúng
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
            // Chuyển COD sang PROCESSING ngay lập tức
            initialStatus = OrderStatus.PROCESSING; 
            internalNote = "THANH TOÁN KHI NHẬN HÀNG (COD): Bắt đầu xử lý.";
        }
        
        const finalNote = note ? `${note} | ${internalNote}` : internalNote;

        // 4. Tạo Đơn hàng và Order Items
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

        // CẬP NHẬT TRẠNG THÁI (PENDING -> SHIPPED theo yêu cầu)
        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: { 
                status: OrderStatus.SHIPPED, // ⬅️ CHUYỂN THẲNG SANG SHIPPED
                updatedAt: new Date(),
                note: `${order.note} | Tự động xác nhận TT - Giao dịch ${payload.transactionCode}.`, 
            },
        });
        
        console.log(`✅ Đơn hàng ${orderId} đã được tự động xác nhận và chuyển sang SHIPPED.`);
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

    // =========================================================
    // HÀM QUẢN LÝ TRẠNG THÁI (CHO ADMIN - TẤT CẢ ĐỀU ĐƯỢC GỌI TỪ CONTROLLER)
    // =========================================================

    private async updateOrderStatus(orderId: number, newStatus: OrderStatus): Promise<Order> {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new NotFoundException(`Order with ID ${orderId} not found.`);
        }
        
        if (order.status === OrderStatus.CANCELLED) {
             throw new BadRequestException(`Order ${orderId} is already cancelled and cannot be updated.`);
        }

        const updatedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: { 
                status: newStatus,
                updatedAt: new Date(),
            },
        });
        
        if (newStatus === OrderStatus.DELIVERED) {
            console.log(`Order ${orderId} marked as DELIVERED. Sales report updated.`);
        }

        return updatedOrder;
    }
   async findOneWithDetails(id: number): Promise<Order & { items: (OrderItem & { product: { name: string } })[] } | null> {
        // ✅ THAY ĐỔI: Dùng include lồng (nested include) để lấy tên sản phẩm
        return this.prisma.order.findUnique({
            where: { id },
            include: { 
                items: {
                    include: {
                        product: { // Tên quan hệ Product trong OrderItem model
                            select: {
                                name: true // Chỉ lấy tên sản phẩm
                            }
                        }
                    }
                }
            }, 
        });
    }
    async updateShippingInfo(
        id: number, 
        trackingCode: string, 
        shippingLabelUrl: string
    ): Promise<Order> {
        // Bạn cần đảm bảo đã thêm trackingCode và shippingLabelUrl vào Prisma Order Schema.
        return this.prisma.order.update({
            where: { id },
            data: {
                trackingCode: trackingCode,
                shippingLabelUrl: shippingLabelUrl,
                status: OrderStatus.SHIPPED, // Tự động chuyển trạng thái sang SHIPPED
                updatedAt: new Date(),
            },
        });
    }

    async processOrder(orderId: number): Promise<Order> {
        return this.updateOrderStatus(orderId, OrderStatus.PROCESSING);
    }

    async shipOrder(orderId: number): Promise<Order> {
        return this.updateOrderStatus(orderId, OrderStatus.SHIPPED);
    }
    
    async deliverOrder(orderId: number): Promise<Order> {
        return this.updateOrderStatus(orderId, OrderStatus.DELIVERED);
    }

    async cancelOrder(orderId: number): Promise<Order> {
        return this.updateOrderStatus(orderId, OrderStatus.CANCELLED);
    }
}