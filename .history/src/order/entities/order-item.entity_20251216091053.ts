// src/orders/entities/order-item.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    productId: number; // ID sản phẩm

    @Column({ length: 255 })
    productName: string;

    @Column()
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 0 })
    price: number; // Giá tại thời điểm đặt hàng

    @Column({ nullable: true, length: 50 })
    selectedSize: string | null; // Size khách chọn

    // Mối quan hệ: Nhiều OrderItem thuộc về một Order
    @ManyToOne(() => Order, order => order.orderItems)
    @JoinColumn({ name: 'orderId' }) // Khóa ngoại
    order: Order;

    @Column()
    orderId: number; // Khóa ngoại
}