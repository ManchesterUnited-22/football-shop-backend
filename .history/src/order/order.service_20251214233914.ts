// src/order/order.service.ts

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto'; 
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
        
        // Trích xuất các trường để tránh lỗi trùng lặp và xử lý riêng biệt
        const { paymentMethod, items, note, status, userId: dtoUserId, ...orderHeaderData } = createOrderDto;

        // 1. Tính toán lại Total Amount
        const subtotal = items.reduce(
            (sum, item) => sum + (item.priceAtPurchase * item.quantity),
            0,
        );
        
        const calculatedTotalAmount = subtotal + SHIPPING_FEE;
        
        if (Math.abs(calculatedTotalAmount - orderHeaderData.totalAmount) > 0.01) {
            throw new BadRequestException('Tổng số tiền đơn hàng không khớp với tính toán.');
        }

        // 2. XÁC ĐỊNH TRẠNG THÁI VÀ GHI CHÚ
        let initialStatus: OrderStatus;
        let internalNote: string;
        
        if (paymentMethod === 'BANK_TRANSFER') {
            initialStatus = OrderStatus.PENDING; 
            internalNote = "CHUYỂN KHOẢN NGÂN HÀNG: Chờ thanh toán. Vui lòng kiểm tra giao dịch.";
        } else { // 'COD'
            initialStatus = OrderStatus.PENDING;
            internalNote = "THANH TOÁN KHI NHẬN HÀNG (COD): Chờ xác nhận và xử lý.";
        }
        
        // Gộp ghi chú khách hàng và ghi chú nội bộ
        const finalNote = notes ? `${notes} | ${internalNote}` : internalNote;

        // 3. Tạo Đơn hàng và Order Items
        try {
            const newOrder = await this.prisma.order.create({
                data: {
                    ...orderHeaderData, 
                    
                    userId: userId, 
                    totalAmount: calculatedTotalAmount,
                    
                    status: initialStatus,
                    // ✅ ĐÃ SỬA LỖI: Sử dụng trường 'note' (Cần phải có trong schema.prisma)
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
    // HÀM QUERY CƠ BẢN (CRUD) - Giữ nguyên logic trước đó
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
            include: { 
                items: true
            }
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
    
    // =========================================================
    // HÀM QUẢN LÝ TRẠNG THÁI (CHO ADMIN) - Giữ nguyên logic trước đó
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