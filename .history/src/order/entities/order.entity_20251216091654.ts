// src/orders/entities/order.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { OrderItem } from './order-item.entity'; // Sẽ tạo ở bước 2
import { OrderStatus } from '../../dto/order.dto'; // Sẽ tạo ở bước 3

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    customerName: string;

    @Column({ length: 20 })
    customerPhone: string;

    @Column('text')
    shippingAddress: string;

    @Column({ type: 'decimal', precision: 10, scale: 0 }) // Decimal cho tiền tệ (VD: 100000)
    totalAmount: number;

    @Column({ 
        type: 'enum', 
        enum: OrderStatus, 
        default: OrderStatus.PENDING 
    })
    status: OrderStatus;

    @Column({ length: 50 })
    paymentMethod: string; // COD hoặc BANK_TRANSFER

    @CreateDateColumn()
    createdAt: Date;

    // === CÁC TRƯỜNG CHO VẬN CHUYỂN (Thêm vào ngay từ đầu) ===
    @Column({ nullable: true, length: 50 })
    trackingCode: string | null;

    @Column({ nullable: true, length: 255 })
    shippingLabelUrl: string | null;

    @Column({ nullable: true, type: 'date' })
    estimatedDeliveryDate: Date | null;
    // =========================================================

    // Mối quan hệ: Một đơn hàng có nhiều chi tiết sản phẩm
    @OneToMany(() => OrderItem, orderItem => orderItem.order)
    orderItems: OrderItem[]; 
}