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
    // HÀM TẠO ĐƠN HÀNG (CREATE) - LOGIC PHƯƠNG THỨC THANH TOÁN
    // =========================================================
    async create(createOrderDto: CreateOrderDto, userId: number): Promise<Order> {
        
        const SHIPPING_FEE = 30000; 
        
        // 1. SỬA LỖI TRÙNG LẶP: Trích xuất các trường đã xử lý riêng biệt 
        // (bao gồm userId từ DTO nếu có, để nó không bị spread vào orderHeaderData)
        const { paymentMethod, items, notes, status, userId: dtoUserId, ...orderHeaderData } = createOrderDto;

        // 2. Tính toán lại Total Amount (Đảm bảo tính toán phía Backend)
        const subtotal = items.reduce(
            (sum, item) => sum + (item.priceAtPurchase * item.quantity),
            0,
        );
        
        const calculatedTotalAmount = subtotal + SHIPPING_FEE;
        
        if (Math.abs(calculatedTotalAmount - orderHeaderData.totalAmount) > 0.01) {
            throw new BadRequestException('Tổng số tiền đơn hàng không khớp với tính toán.');
        }

        // 3. XÁC ĐỊNH TRẠNG THÁI KHỞI TẠO DỰA TRÊN PAYMENT METHOD
        let initialStatus: OrderStatus;
        let initialNote: string;
        
        if (paymentMethod === 'BANK_TRANSFER') {
            initialStatus = OrderStatus.PENDING; 
            initialNote = "CHUYỂN KHOẢN NGÂN HÀNG: Chờ thanh toán. Vui lòng kiểm tra giao dịch.";
        } else { // 'COD'
            initialStatus = OrderStatus.PENDING;
            initialNote = "THANH TOÁN KHI NHẬN HÀNG (COD): Chờ xác nhận và xử lý.";
        }
        
        const finalNotes = notes ? `${notes} | ${initialNote}` : initialNote;


        // 4. Tạo Đơn hàng và Order Items trong một Transaction
        try {
            const newOrder = await this.prisma.order.create({
                data: {
                    // Dữ liệu Header (Không chứa userId bị trùng)
                    ...orderHeaderData, 
                    
                    // Gán userId từ Token (chính xác nhất)
                    userId: userId, 
                    totalAmount: calculatedTotalAmount,
                    
                    // Trạng thái khởi tạo
                    status: initialStatus,
                    
                    // SỬA LỖI TÊN TRƯỜNG: Dùng 'note' thay vì 'notes'
                    note: finalNotes, 
                    
                    // Tạo Order Items lồng nhau (createMany)
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
    // HÀM QUERY CƠ BẢN (CRUD)
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
    
    /**
     * Lấy tất cả đơn hàng của một người dùng, bao gồm chi tiết item.
     */
    async findUserOrders(userId: number) {
        return this.prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }, 
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                images: true,
                            }
                        },
                        variant: {
                            select: {
                                sizeValue: true,
                            }
                        }
                    }
                }, 
            },
        });
    }
    
    // =========================================================
    // HÀM QUẢN LÝ TRẠNG THÁI (CHO ADMIN)
    // =========================================================

    /**
     * Hàm hỗ trợ chung để chuyển trạng thái đơn hàng.
     */
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

    /** Chuyển trạng thái sang PROCESSING (Admin xác nhận thanh toán/bắt đầu đóng gói) */
    async processOrder(orderId: number): Promise<Order> {
        return this.updateOrderStatus(orderId, OrderStatus.PROCESSING);
    }

    /** Chuyển trạng thái sang SHIPPED (Admin đã giao cho đơn vị vận chuyển) */
    async shipOrder(orderId: number): Promise<Order> {
        return this.updateOrderStatus(orderId, OrderStatus.SHIPPED);
    }
    
    /** ✅ CHUYỂN SANG DELIVERED: Đánh dấu đơn hàng thành công và tính vào báo cáo */
    async deliverOrder(orderId: number): Promise<Order> {
        return this.updateOrderStatus(orderId, OrderStatus.DELIVERED);
    }

    /** Chuyển trạng thái sang CANCELLED */
    async cancelOrder(orderId: number): Promise<Order> {
        return this.updateOrderStatus(orderId, OrderStatus.CANCELLED);
    }
}