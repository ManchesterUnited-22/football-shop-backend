// backend/src/products/products.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CategoryService } from 'src/category/category.service';
import { Prisma, ProductVariant, SizeType } from '@prisma/client';

// =========================================================
// INTERFACES
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

interface LowStockFilter {
  threshold: number;
  categoryId?: number;
  limit: number; 
}

// =========================================================
// LOGIC TÍNH GIÁ DỰA TRÊN SIZE (FLOAT SAFE)
// =========================================================
function calculateFinalPrice(basePrice: number, sizeValue: string, threshold: string, percentage: number): number {
  if (!basePrice || !percentage || !threshold) {
    return basePrice;
  }
  
  const numThreshold = parseFloat(threshold);
  const numSizeValue = parseFloat(sizeValue);

  let finalBase = basePrice;

  // Nếu size là số (Giày 38, 39, 40...)
  if (!isNaN(numThreshold) && !isNaN(numSizeValue)) {
    if (numSizeValue >= numThreshold) {
      finalBase = basePrice + (basePrice * (percentage / 100));
    }
  } else {
    // Nếu size là chữ (S, M, L, XL...)
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
    const thresholdIndex = sizeOrder.indexOf(threshold.toUpperCase());
    const variantIndex = sizeOrder.indexOf(sizeValue.toUpperCase());

    if (thresholdIndex !== -1 && variantIndex !== -1 && variantIndex >= thresholdIndex) {
      finalBase = basePrice + (basePrice * (percentage / 100));
    }
  }

  return parseFloat(finalBase.toFixed(2));
}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private categoryService: CategoryService,
  ) {}

  // =========================================
  // HELPER: LOGIC KHUYẾN MẠI TỰ ĐỘNG
  // =========================================
  private applyPromotion(price: number, discount: number, start: Date, end: Date) {
    const now = new Date();
    const isSale = 
      discount > 0 && 
      start && end && 
      now >= new Date(start) && 
      now <= new Date(end);

    const currentPrice = isSale 
      ? price * (1 - discount / 100) 
      : price;

    return {
      isSale,
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      discountPercent: isSale ? discount : 0
    };
  }

  // =========================================
  // 1. TẠO SẢN PHẨM MỚI (CẬP NHẬT TRƯỜNG PROMO)
  // =========================================
  async create(createProductDto: any, userId: number) {
    const { 
      name, price, description, categoryId, sizeType, sizeOptions, 
      sizeIncreaseThreshold, sizeIncreasePercentage, images,
      variants: incomingVariants,
      discount, promoStart, promoEnd, promoName // Các trường mới
    } = createProductDto;

    const existingProduct = await this.prisma.product.findFirst({ where: { name } });
    if (existingProduct) throw new BadRequestException('Sản phẩm với tên này đã tồn tại.');

    const productSlug = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${Date.now()}`;

    let variantData: any[] = [];
    if (categoryId === 3 && (!incomingVariants || incomingVariants.length === 0)) {
      variantData = [{ sizeValue: 'ONESIZE', stock: 9999, color: 'Default', sku: `ACC-${Date.now()}` }];
    } else if (incomingVariants?.length > 0) {
      variantData = incomingVariants.map(v => ({ ...v, sku: v.sku || `SKU-${Date.now()}-${v.sizeValue}` }));
    }

    return this.prisma.product.create({
      data: {
        name,
        slug: productSlug,
        description,
        price: parseFloat(price.toString()),
        images: images || [],
        categoryId: categoryId || null,
        userId: userId,
        sizeType,
        sizeIncreaseThreshold,
        sizeIncreasePercentage: sizeIncreasePercentage ? parseFloat(sizeIncreasePercentage.toString()) : null,
        // Lưu thông tin khuyến mại
        discount: discount ? parseFloat(discount.toString()) : 0,
        promoStart: promoStart ? new Date(promoStart) : null,
        promoEnd: promoEnd ? new Date(promoEnd) : null,
        promoName: promoName || null,
        variants: variantData.length > 0 ? { createMany: { data: variantData } } : undefined,
      },
      include: { category: true, variants: true },
    });
  }

  // =========================================
  // 2. LẤY TẤT CẢ (TRẢ VỀ GIÁ ĐÃ GIẢM NẾU CÓ)
  // =========================================
  async findAll(filters: ProductFilters) {
    const where: any = {};
    const orderBy: any = {};

    if (filters.categoryId) where.categoryId = Number(filters.categoryId);
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    // Lọc giá dựa trên giá gốc (Price)
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice) where.price.gte = parseFloat(filters.minPrice.toString());
      if (filters.maxPrice) where.price.lte = parseFloat(filters.maxPrice.toString());
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: filters.sortBy ? { [filters.sortBy]: filters.sortOrder || 'desc' } : { createdAt: 'desc' },
      include: { category: true, variants: true },
    });

    // Map qua từng sản phẩm để tính giá Sale thời gian thực
    return products.map(p => {
      const promo = this.applyPromotion(p.price, p.discount, p.promoStart, p.promoEnd);
      return {
        ...p,
        currentPrice: promo.currentPrice,
        isSale: promo.isSale,
        promoName: promo.isSale ? p.promoName : null
      };
    });
  }

  // =========================================
  // 3. CHI TIẾT (TÍNH GIÁ SIZE + GIẢM GIÁ)
  // =========================================
  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { variants: true, category: true },
    });

    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm`);

    const { price, discount, promoStart, promoEnd, variants, ...rest } = product;

    // Bước 1: Tính giá theo Size cho từng Variant
    const modifiedVariants = variants.map(v => {
      const sizePrice = calculateFinalPrice(
        price, 
        v.sizeValue, 
        product.sizeIncreaseThreshold, 
        product.sizeIncreasePercentage
      );

      // Bước 2: Áp dụng giảm giá lên giá đã tính theo size
      const promo = this.applyPromotion(sizePrice, discount, promoStart, promoEnd);

      return {
        ...v,
        originalVariantPrice: sizePrice, // Giá sau khi tăng size nhưng chưa giảm
        calculatedPrice: promo.currentPrice, // Giá cuối cùng khách phải trả
        isSale: promo.isSale
      };
    });

    // Tính giá hiển thị đại diện cho Product
    const mainPromo = this.applyPromotion(price, discount, promoStart, promoEnd);

    return {
      ...rest,
      price, // Giá gốc ban đầu
      currentPrice: mainPromo.currentPrice,
      isSale: mainPromo.isSale,
      promoName: mainPromo.isSale ? product.promoName : null,
      promoEnd: product.promoEnd, // Gửi về để làm đồng hồ đếm ngược
      variants: modifiedVariants
    };
  }

  // =========================================
  // 4. CẬP NHẬT (TRANSACTION)
  // =========================================
  async update(id: number, updateData: any) {
    // Đảm bảo ép kiểu các trường số và ngày tháng
    if (updateData.price) updateData.price = parseFloat(updateData.price.toString());
    if (updateData.discount !== undefined) updateData.discount = parseFloat(updateData.discount.toString());
    if (updateData.promoStart) updateData.promoStart = new Date(updateData.promoStart);
    if (updateData.promoEnd) updateData.promoEnd = new Date(updateData.promoEnd);

    // Xử lý Transaction như cũ của bạn...
    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: { variants: true, category: true }
    });
  }

  // ... các hàm remove, updateStock giữ nguyên ...
}