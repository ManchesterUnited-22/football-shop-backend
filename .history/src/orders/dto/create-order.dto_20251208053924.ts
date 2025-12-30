// src/orders/dto/create-order.dto.ts

import { IsNotEmpty, IsNumber, IsString, IsArray, ArrayMinSize, ValidateNested, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class ItemDto {
    @IsNumber()
    productId: number;

    @IsOptional()
    @IsNumber()
    variantId: number;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    price: number;

    @IsNumber()
    quantity: number;
}

class CustomerInfoDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsOptional()
    @IsString()
    notes: string;

    @IsString()
    @IsIn(['COD', 'TRANSFER'])
    paymentMethod: 'COD' | 'TRANSFER';
}

export class CreateOrderDto {
    @ValidateNested()
    @Type(() => CustomerInfoDto)
    customerInfo: CustomerInfoDto;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ItemDto)
    items: ItemDto[];

    @IsNumber()
    subtotal: number;
    
    @IsNumber()
    shippingFee: number;
}