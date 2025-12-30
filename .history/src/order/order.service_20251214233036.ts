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
        const { paymentMethod, items, notes, status, ...orderHeaderData } = createOrderDto;

        // 1. Tính toán lại Total Amount (Đảm bảo tính toán phía Backend)
        const subtotal = items.reduce(
            (sum, item) => sum + (item.priceAtPurchase * item.quantity),
            0,
        );
        
        const calculatedTotalAmount = subtotal + SHIPPING_FEE;
        
        // Kiểm tra tính toàn vẹn dữ liệu từ Frontend
        if (Math.abs(calculatedTotalAmount - orderHeaderData.totalAmount) > 0.01) {
            throw new BadRequestException('Tổng số tiền đơn hàng không khớp với tính toán.');
        }

        // 2. XÁC ĐỊNH TRẠNG THÁI KHỞI TẠO DỰA TRÊN PAYMENT METHOD
        let initialStatus: OrderStatus;
        let initialNote: string;
        
        // Nếu client không gửi status, chúng ta tự xác định trạng thái dựa trên phương thức thanh toán
        if (paymentMethod === 'BANK_TRANSFER') {
            // Đặt PENDING cho cả hai trường hợp (ADMIN sẽ chuyển sang PROCESSING sau khi nhận tiền)
            initialStatus = OrderStatus.PENDING; 
            initialNote = "CHUYỂN KHOẢN NGÂN HÀNG: Chờ thanh toán. Vui lòng kiểm tra giao dịch.";
        } else { // 'COD'
            initialStatus = OrderStatus.PENDING;
            initialNote = "THANH TOÁN KHI NHẬN HÀNG (COD): Chờ xác nhận và xử lý.";
        }
        
        // Gộp ghi chú từ client và ghi chú nội bộ
        const finalNotes = notes ? `${notes} | ${initialNote}` : initialNote;


        // 3. Tạo Đơn hàng và Order Items trong một Transaction
        try {
            const newOrder = await this.prisma.order.create({
                data: {
                    userId: userId, 
                    // Dữ liệu Header
                    ...orderHeaderData,
                    totalAmount: calculatedTotalAmount,
                    
                    // Trạng thái khởi tạo
                    status: initialStatus,
                    notes: finalNotes,
                    
                    // Tạo Order Items lồng nhau (createMany)
                    items: {
                        createMany: {
                            data: items.map(item => ({
                                productId: item.productId,
                                variantId: item.variantId,
                                quantity: item.quantity,
                                priceAtPurchase: item.priceAtPurchase,
                                // (Các trường Denormalization khác nếu cần)
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
                        // JOIN Product để lấy name và images
                        product: {
                            select: {
                                name: true,
                                images: true,
                            }
                        },
                        // JOIN ProductVariant để lấy sizeValue
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
        
        // Ngăn chặn cập nhật đơn đã Hủy
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
        
        // ✅ Logic quan trọng cho báo cáo bán hàng
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