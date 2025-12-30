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

        let initialStatus: OrderStatus;
        let internalNote: string;
        
        if (paymentMethod === 'BANK_TRANSFER') {
            initialStatus = OrderStatus.PENDING; 
            internalNote = "CHUYỂN KHOẢN NGÂN HÀNG: Chờ thanh toán qua QR. Đơn hàng sẽ tự động xác nhận.";
        } else { 
            initialStatus = OrderStatus.PENDING; 
            internalNote = "THANH TOÁN KHI NHẬN HÀNG (COD): Chờ Admin xử lý.";
        }
        
        const finalNote = note ? `${note} | ${internalNote}` : internalNote;

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
     * Hàm cho Frontend User lấy danh sách đơn hàng theo trạng thái và User ID
     */
    async findUserOrdersByStatus(userId: number, status: OrderStatus): Promise<Order[]> {
        return this.prisma.order.findMany({
            where: { 
                userId, 
                status, 
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
    // HÀM QUẢN LÝ TRẠNG THÁI (CHO ADMIN & CONFIRM)
    // =========================================================
    
    /**
     * Hàm trợ giúp chung để cập nhật trạng thái đơn hàng. 
     */
    async updateStatus(id: number, newStatus: OrderStatus) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found.`);
        }
        
        if (order.status === OrderStatus.CANCELLED) {
            throw new BadRequestException(`Order ${id} đã bị hủy và không thể cập nhật.`);
        }

        const updatedOrder = await this.prisma.order.update({
            where: { id },
            data: { 
                status: newStatus,
                updatedAt: new Date(),
            },
        });
        
        return updatedOrder;
    }

    /**
     * Chuyển trạng thái sang PROCESSING (Admin Step 1)
     */
    async processOrder(orderId: number): Promise<Order> {
        // ✅ ĐÃ SỬA LỖI: Gọi updateStatus thay vì updateOrderStatus
        const processedOrder = await this.updateStatus(orderId, OrderStatus.PROCESSING); 
        return processedOrder; 
    }

    // Các hàm chuyển trạng thái còn lại (SỬ DỤNG updateStatus)
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