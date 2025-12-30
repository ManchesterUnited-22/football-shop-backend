import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CategoryService } from 'src/category/category.service';
import { Prisma, ProductVariant, SizeType } from '@prisma/client';

// =========================================================
// INTERFACE CHO TÍNH NĂNG UPDATE (Giữ nguyên)
// =========================================================

interface ProductFilters {
  q?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UpdateProductVariantDto extends Omit<ProductVariant, 
  'id' | 
  'productId' | 
  'createdAt' | 
  'updatedAt'
> {
    id?: number; 
}

// Logic tính giá (Giữ nguyên)
function calculateFinalPrice(basePrice: number, sizeValue: string, threshold: string, percentage: number): number {
    if (!basePrice || !percentage || !threshold) {
        return basePrice;
    }
      const numThreshold = parseFloat(threshold);
    const numSizeValue = parseFloat(sizeValue);
    if (!isNaN(numThreshold) && !isNaN(numSizeValue)) {
        if (numSizeValue >= numThreshold) {
            const increaseAmount = basePrice * (percentage / 100);
            return basePrice + increaseAmount;
        }
        return basePrice;
    }
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];

    const thresholdIndex = sizeOrder.indexOf(threshold.toUpperCase());
    const variantIndex = sizeOrder.indexOf(sizeValue.toUpperCase());

    if (thresholdIndex === -1 || variantIndex === -1) {
        return basePrice;
    }
    
    if (variantIndex >= thresholdIndex) {
        const increaseAmount = basePrice * (percentage / 100);
        return basePrice + increaseAmount;
    }

    return basePrice;
}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private categoryService: CategoryService,
  ) {}

  // =========================================
  // TẠO SẢN PHẨM MỚI (Giữ nguyên)
  // =========================================
 async create(createProductDto: CreateProductDto, userId: number) {
    const { 
      name, 
      price, 
      description, 
      categoryId, 
      sizeType, 
      sizeOptions, 
      sizeIncreaseThreshold, 
      sizeIncreasePercentage,
      images,
      variants: incomingVariants,
    } = createProductDto;

    // Kiểm tra Category và Trùng tên
    if (categoryId) {
      const categoryExists = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!categoryExists) throw new NotFoundException(`Category với ID ${categoryId} không tồn tại.`);
    }
    const existingProduct = await this.prisma.product.findFirst({ where: { name } });
    if (existingProduct) throw new BadRequestException('Sản phẩm với tên này đã tồn tại.');

    // ⭐️ TẠO SLUG SẠCH ⭐️
    const cleanedName = name
        .toLowerCase()
        .replace(/\s+/g, '-')  
        .replace(/[^\w-]+/g, ''); 

    const productSlug = cleanedName + '-' + Date.now();

    let variantData: any[] = [];
if (incomingVariants && incomingVariants.length > 0) {
        variantData = incomingVariants.map(v => ({
            sizeValue: v.sizeValue,
            stock: v.stock, // Lấy stock đã nhập từ Frontend
            color: v.color,
            sku: v.sku || `${name.substring(0, 3).toUpperCase()}-${v.sizeValue}`, 
        }));
    }// app/checkout/page.tsx

'use client';
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// ⭐️ Đã import CartItem để sửa lỗi 7006 ⭐️
import { useCart, CartItem } from '../../context/CartContext'; 
import Link from 'next/link';

// Helper để format tiền tệ
const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

export default function CheckoutPage() {
    // ⭐️ SỬA LỖI 2339: Lấy các giá trị được trả về từ hook useCart ⭐️
    const { cartItems, cartCount, clearCart } = useCart();
    const router = useRouter();
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        notes: '',
        paymentMethod: 'COD' as 'COD' | 'TRANSFER'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Tính toán Tổng tiền
    const subtotal = useMemo(() => {
        // ⭐️ SỬA LỖI 7006: Định rõ kiểu dữ liệu cho total và item ⭐️
        return cartItems.reduce((total: number, item: CartItem) => total + (item.price * item.quantity), 0);
    }, [cartItems]);

    const shippingFee = 30000;
    const totalAmount = subtotal + shippingFee;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (cartCount === 0) {
            alert("Giỏ hàng rỗng. Vui lòng thêm sản phẩm.");
            return;
        }

        // Kiểm tra validation cơ bản
        if (!formData.name || !formData.phone || !formData.address) {
            alert("Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ.");
            return;
        }

        const orderData = {
            customerInfo: formData,
            items: cartItems.map((item: CartItem) => ({
                productId: item.productId,
                variantId: item.variantId, 
                quantity: item.quantity,
                price: item.price,
            })),
            totalAmount: totalAmount,
            shippingFee: shippingFee,
        };

        setIsSubmitting(true);
        try {
            // THAY THẾ bằng API call thật:
            // const response = await fetch('http://localhost:3000/api/orders', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(orderData),
            // });
            // if (!response.ok) throw new Error('Đặt hàng thất bại.');
            
            // Mock delay
            await new Promise(resolve => setTimeout(resolve, 1500)); 

            alert('✅ Đặt hàng thành công! Đơn hàng sẽ được xử lý sớm nhất.');
            
            // Xóa giỏ hàng sau khi đặt hàng thành công
            clearCart(); 
            router.push('/order-confirmation'); 

        } catch (error) {
            console.error('Lỗi khi đặt hàng:', error);
            alert('❌ Lỗi khi đặt hàng. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (cartCount === 0) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center mt-10">
                <h1 className="text-2xl font-bold mb-4">Giỏ hàng của bạn đang trống!</h1>
                <Link href="/" className="text-blue-600 hover:underline">
                    Quay lại trang chủ để mua sắm.
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8">
            <h1 className="text-4xl font-extrabold mb-8 text-red-600 border-b pb-2">Thanh Toán Đơn Hàng</h1>
            
            <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* 1. CỘT THÔNG TIN GIAO HÀNG */}
                <div className="lg:col-span-2 bg-white p-6 shadow-xl rounded-lg border">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800">1. Thông tin Giao hàng</h2>
                    
                    {/* Các Input (Name, Phone, Address, Notes) */}
                    <div className="mb-4">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Họ và Tên (*)</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Số Điện Thoại (*)</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">Địa chỉ Giao hàng (*)</label>
                        <textarea
                            id="address"
                            name="address"
                            rows={3}
                            value={formData.address}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                    
                    <div className="mb-6">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Ghi chú (Tùy chọn)</label>
                        <textarea
                            id="notes"
                            name="notes"
                            rows={2}
                            value={formData.notes}
                            onChange={handleChange}
                            className="mt-1 block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                        />
                    </div>

                    <h2 className="text-2xl font-bold mb-6 text-gray-800">2. Phương thức Thanh toán</h2>
                    
                    {/* Payment Method Selector */}
                    <div className="space-y-4">
                        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="COD"
                                checked={formData.paymentMethod === 'COD'}
                                onChange={handleChange}
                                className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-900">Thanh toán khi nhận hàng (COD)</span>
                        </label>
                        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="TRANSFER"
                                checked={formData.paymentMethod === 'TRANSFER'}
                                onChange={handleChange}
                                className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-900">Chuyển khoản Ngân hàng</span>
                        </label>
                    </div>
                </div>

                {/* 2. CỘT TÓM TẮT ĐƠN HÀNG */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 p-6 shadow-xl rounded-lg border sticky top-10">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">Tóm tắt Đơn hàng</h2>

                        {/* Danh sách sản phẩm rút gọn */}
                        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                            {/* ⭐️ SỬA LỖI 7006: Định rõ kiểu dữ liệu cho item và index ⭐️ */}
                            {cartItems.map((item: CartItem, index: number) => (
                                <div key={index} className="flex justify-between text-sm text-gray-600">
                                    <span className="truncate pr-2">
                                        {item.name} ({item.sizeValue}) x {item.quantity}
                                    </span>
                                    <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-4 space-y-3">
                            <div className="flex justify-between text-base">
                                <span>Tạm tính:</span>
                                <span className="font-semibold">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-base">
                                <span>Phí vận chuyển:</span>
                                <span className="font-semibold">{formatCurrency(shippingFee)}</span>
                            </div>
                            
                            <div className="flex justify-between text-xl font-bold text-red-600 border-t pt-4 mt-4">
                                <span>TỔNG CỘNG:</span>
                                <span>{formatCurrency(totalAmount)}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Nút ĐẶT HÀNG CUỐI CÙNG */}
                    <button
                        type="submit"
                        disabled={isSubmitting || cartCount === 0}
                        className={`mt-6 w-full py-4 rounded-lg font-bold text-lg transition active:scale-95 shadow-xl
                            ${isSubmitting || cartCount === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                    >
                        {isSubmitting ? 'ĐANG XỬ LÝ...' : 'ĐẶT HÀNG'}
                    </button>
                </div>
            </form>
        </div>
    );
}
else
    // Xử lý Logic Tách Chuỗi Size thành Variants
    if (sizeType !== 'NONE' && sizeOptions) {
      const sizes = sizeOptions.split(',')
                               .map(s => s.trim())
                               .filter(s => s.length > 0);

      variantData = sizes.map(size => ({
        sizeValue: size,
        stock: 0, 
        sku: `${name.substring(0, 3).toUpperCase()}-${size}`, 
      }));
    }

    // Tạo sản phẩm bằng Prisma Nested Write
    try {
        return await this.prisma.product.create({
            data: {
                name,
                slug: productSlug, 
                description,
                price: price, 
                images: images || [], 
                categoryId: categoryId || null,
                userId: userId,
                sizeType: sizeType, 
                
                // CÁC TRƯỜNG CÓ THỂ LÀ NULL
                sizeIncreaseThreshold: sizeIncreaseThreshold === undefined ? null : sizeIncreaseThreshold, 
                sizeIncreasePercentage: sizeIncreasePercentage === undefined ? null : sizeIncreasePercentage, 
                
                variants: variantData.length > 0 ? { createMany: { data: variantData } } : undefined,
            },
            include: { category: true, variants: true },
        });
    } catch (e) {
        console.error("[PRISMA CREATE ERROR]: ", e); 
        throw new BadRequestException('Lỗi khi lưu dữ liệu. Kiểm tra log chi tiết.');
    }

  }

  // ===========================
  // LẤY TẤT CẢ SẢN PHẨM (Giữ nguyên)
  // ===========================
  async findAll(filters: ProductFilters) {
    // ... (Giữ nguyên logic findAll)
    const where: any = {};
    const orderBy: any = {};

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }
    if (filters.sortBy && filters.sortOrder) {
      const validSortFields = ['price', 'createdAt', 'name'];
      if (validSortFields.includes(filters.sortBy)) {
        orderBy[filters.sortBy] = filters.sortOrder;
      } else {
        orderBy.createdAt = 'desc';
      }
    } else {
      orderBy.createdAt = 'desc';
    }

    return this.prisma.product.findMany({
      where,
      orderBy,
      include: { category: true, variants: true },
    });
  }

  // ===========================
  // LẤY THEO SLUG (Giữ nguyên)
  // ===========================
  async findOne(slug: string) {
    // ... (Giữ nguyên logic findOne)
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { variants: true, category: true },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với slug: ${slug}`);
    }
    const { price, sizeType, sizeIncreaseThreshold, sizeIncreasePercentage, variants, ...productData } = product;

    // Chỉ áp dụng logic nếu sizeType là PERCENTAGE và có thiết lập ngưỡng/phần trăm
    if (sizeType !== SizeType.NONE && sizeIncreaseThreshold && sizeIncreasePercentage !== null) {
        
        const modifiedVariants = variants.map(variant => {
            const finalPrice = calculateFinalPrice(
                price,
                variant.sizeValue,
                sizeIncreaseThreshold,
                sizeIncreasePercentage
            );

            return {
                ...variant,
                calculatedPrice: finalPrice, 
            };
        });

        return {
            ...productData,
            price: price, 
            variants: modifiedVariants, 
        };
    }
    return product;
  }

  // ===========================
  // XÓA SẢN PHẨM (Giữ nguyên)
  // ===========================
  async remove(id: number) {
    await this.prisma.productVariant.deleteMany({ where: { productId: id } });
    return this.prisma.product.delete({ where: { id } });
  }

  // ====================================================
  // CẬP NHẬT SẢN PHẨM (ĐÃ SỬA: Xử lý lỗi P2002 và Tối ưu hóa Ảnh)
  // ====================================================
  async update(id: number, updateData: any) { 
    if (!updateData) {
      throw new BadRequestException('Update data is required');
    }

    // Tách variants ra khỏi dữ liệu chính
    const { variants: incomingVariants, ...productData } = updateData;
    const finalUpdateData: any = {};

    // 1. XỬ LÝ LỖI P2002 VÀ CHUẨN BỊ DỮ LIỆU CẬP NHẬT PRODUCT CHÍNH
    // Lấy sản phẩm hiện tại để so sánh và tạo slug
    const currentProduct = await this.prisma.product.findUnique({
        where: { id },
        select: { name: true, slug: true },
    });

    if (!currentProduct) {
        throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Xử lý trường Tên (để tránh lỗi P2002)
    if (productData.name !== undefined) {
        if (productData.name === currentProduct.name) {
            // Tên không thay đổi, KHÔNG đưa trường name vào finalUpdateData
        } else {
            // Tên đã thay đổi, cập nhật tên và tạo slug mới
            finalUpdateData.name = productData.name;
            
            const cleanedName = productData.name
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '');
            
            finalUpdateData.slug = cleanedName + '-' + Date.now();
        }
    }
    // Kết thúc xử lý Tên và Slug
    

    // Tiếp tục chuẩn bị các trường còn lại:
    if (productData.description !== undefined) finalUpdateData.description = productData.description;
    if (productData.price !== undefined) finalUpdateData.price = productData.price;
    if (productData.categoryId !== undefined) finalUpdateData.categoryId = productData.categoryId;
    
    // Quản lý ảnh (Cơ chế Ghi đè Mảng)
    if (productData.images !== undefined) {
      finalUpdateData.images = Array.isArray(productData.images) ? productData.images : [productData.images];
    }

    // CÁC TRƯỜNG CẤU HÌNH SIZE
    if (productData.sizeType !== undefined) finalUpdateData.sizeType = productData.sizeType;
    if (productData.sizeIncreaseThreshold !== undefined) finalUpdateData.sizeIncreaseThreshold = productData.sizeIncreaseThreshold;
    if (productData.sizeIncreasePercentage !== undefined) finalUpdateData.sizeIncreasePercentage = productData.sizeIncreasePercentage;

    // Kiểm tra nếu không có gì để cập nhật cho Product chính
    if (Object.keys(finalUpdateData).length === 0 && !incomingVariants) {
        // Không có dữ liệu cập nhật Product chính và không có variants
        return currentProduct;
    }

    // 2. XỬ LÝ TRƯỜNG HỢP KHÔNG CÓ VARIANTS ĐƯỢC CẬP NHẬT
    if (!incomingVariants) {
      return this.prisma.product.update({
        where: { id },
        data: finalUpdateData, // Sử dụng dữ liệu đã được xử lý name/slug
        include: { variants: true, category: true },
      });
    }

    // 3. XỬ LÝ VARIANTS VỚI TRANSACTION (Giữ nguyên)
    const transactionOps: Prisma.PrismaPromise<any>[] = [];
    const existingVariants = await this.prisma.productVariant.findMany({ where: { productId: id }, select: { id: true } });
    const existingIds = existingVariants.map(v => v.id);

    const variantsList = incomingVariants as UpdateProductVariantDto[];
    const toUpdate = variantsList.filter(v => v.id);
    const toCreate = variantsList.filter(v => !v.id);

    const keepIds = toUpdate.map(v => v.id);
    const toDelete = existingIds.filter(id => !keepIds.includes(id));

    // Thao tác Xóa
    if (toDelete.length > 0) {
      transactionOps.push(this.prisma.productVariant.deleteMany({ where: { id: { in: toDelete } } }));
    }

    // Thao tác Cập nhật
    toUpdate.forEach(v => {
      if (existingIds.includes(v.id!)) {
        transactionOps.push(this.prisma.productVariant.update({
          where: { id: v.id },
          data: {
            sizeValue: v.sizeValue, // Dùng sizeValue
            color: v.color,
            stock: v.stock,
            sku: v.sku,
          },
        }));
      }
    });

    // Thao tác Tạo mới
    if (toCreate.length > 0) {
      const productName = productData.name || currentProduct?.name || 'PRO'; // Sử dụng currentProduct
      const createData = toCreate.map(v => ({
        sizeValue: v.sizeValue, // Dùng sizeValue
        color: v.color,
        stock: v.stock,
        productId: id,
        sku: v.sku || `${productName.substring(0, 3).toUpperCase()}-${v.sizeValue}-${v.color || 'NA'}`,
      }));
      transactionOps.push(this.prisma.productVariant.createMany({ data: createData }));
    }

    // Thao tác Cập nhật Product chính
    transactionOps.push(this.prisma.product.update({
      where: { id },
      data: finalUpdateData, // Sử dụng dữ liệu đã được xử lý name/slug
      include: { variants: true, category: true },
    }));

    const results = await this.prisma.$transaction(transactionOps);
    return results[results.length - 1];
  }
}