// src/orders/schemas/order.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Định nghĩa cấu trúc Item trong đơn hàng
@Schema()
class OrderItem {
    @Prop({ required: true })
    productId: number;

    @Prop({ required: false })
    variantId: number;
    
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    quantity: number;
}
const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// Định nghĩa cấu trúc Thông tin khách hàng
@Schema()
class CustomerInfo {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    phone: string;

    @Prop({ required: true })
    address: string;

    @Prop({ required: false })
    notes: string;

    @Prop({ enum: ['COD', 'TRANSFER'], default: 'COD' })
    paymentMethod: string;
}
const CustomerInfoSchema = SchemaFactory.createForClass(CustomerInfo);

// Định nghĩa cấu trúc Đơn hàng chính
@Schema({ timestamps: true })
export class Order extends Document {
    @Prop({ type: CustomerInfoSchema, required: true })
    customerInfo: CustomerInfo;

    @Prop({ type: [OrderItemSchema], required: true })
    items: OrderItem[];

    @Prop({ required: true })
    subtotal: number;

    @Prop({ required: true })
    shippingFee: number;
    
    @Prop({ required: true })
    totalAmount: number;

    @Prop({ enum: ['Pending', 'Confirmed', 'Delivered', 'Cancelled'], default: 'Pending' })
    status: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);