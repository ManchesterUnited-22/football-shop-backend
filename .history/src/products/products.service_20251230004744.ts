// backend/src/products/products.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

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

interface LowStockFilter {
  threshold: number;
  categoryId?: number;
  limit: number; 
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // =========================================================
  // LOGIC HỖ TRỢ (PRIVATE HELPERS)
  // =========================================================

  /**
   * Tính giá gốc của Variant dựa trên Size (Ví dụ: Size XL tăng 10%)
   */
  private calculateSizePrice(
    basePrice: number, 
    sizeValue: string, 
    threshold: string | null, 
    percentage: number | null
  ): number {
    if (!basePrice || percentage === null || !threshold) return basePrice;
    
    const numThreshold = parseFloat(threshold);
    const numSizeValue = parseFloat(sizeValue);
    let finalBase = basePrice;

    if (!isNaN(numThreshold) && !isNaN(numSizeValue)) {
      if (numSizeValue >= numThreshold) {
        finalBase = basePrice + (basePrice * (percentage / 100));
      }
    } else {
      const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
      const thresholdIndex = sizeOrder.indexOf(threshold.toUpperCase());
      const variantIndex = sizeOrder.indexOf(sizeValue.toUpperCase());

      if (thresholdIndex !== -1 && variantIndex !== -1 && variantIndex >= thresholdIndex) {
        finalBase = basePrice + (basePrice * (percentage / 100));
      }
    }
    return finalBase;
  }

  /**
   * Tính toán giá khuyến mãi dựa trên thời gian thực
   */
  private applyPromotion(price: number, discount: number | null, start: Date | null, end: Date | null) {
    const now = new Date();
    const isSale = 
      (discount ?? 0) > 0 && 
      start !== null && 
      end !== null && 
      now >= new Date(start) && 
      now <= new Date(end);

    const currentPrice = isSale 
      ? price * (1 - (discount ?? 0) / 100) 
      : price;

    return {
      isSale,
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      discountPercent: isSale ? (discount ?? 0) : 0
    };
  }

  // =========================================
  // 1. QUẢN LÝ SẢN PHẨM (CRUD)
  // =========================================

  async create(createProductDto: any, userId: number) {
    const { 
      name, price, description, categoryId, sizeType, sizeOptions, 
      sizeIncreaseThreshold, sizeIncreasePercentage, images,
      variants: incomingVariants,
      discount, promoStart, promoEnd, promoName 
    } = createProductDto;

    const existingProduct = await this.prisma.product.findFirst({ where: { name } });
    if (existingProduct) throw new BadRequestException('Sản phẩm với tên này đã tồn tại.');

    const productSlug = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${Date.now()}`;

    let variantData: any[] = [];
    if (categoryId === 3 && (!incomingVariants || incomingVariants.length === 0)) {
      variantData = [{ sizeValue: 'ONESIZE', stock: 9999, color: 'Default', sku: `ACC-${Date.now()}` }];
    } else if (incomingVariants?.length > 0) {
      variantData = incomingVariants.map(v => ({ 
        ...v, 
        sku: v.sku || `SKU-${Date.now()}-${v.sizeValue.toUpperCase()}` 
      }));
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
        discount: discount ? parseFloat(discount.toString()) : 0,
        promoStart: promoStart ? new Date(promoStart) : null,
        promoEnd: promoEnd ? new Date(promoEnd) : null,
        promoName: promoName || null,
        variants: variantData.length > 0 ? { createMany: { data: variantData } } : undefined,
      },
      include: { category: true, variants: true },
    });
  }

  async findAll(filters: ProductFilters) {
    const where: any = {
      isDeleted: false,
    };
    if (filters.categoryId) where.categoryId = Number(filters.categoryId);
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

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
    const now = new Date();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    return products.map(p => {
      const promo = this.applyPromotion(p.price, p.discount, p.promoStart, p.promoEnd);
      const isNew = (now.getTime() - new Date(p.createdAt).getTime()) <= SEVEN_DAYS_MS;
      return {
        ...p,
        currentPrice: promo.currentPrice,
        isSale: promo.isSale,
        isNew,
        promoName: promo.isSale ? p.promoName : null,
        promoEnd: p.promoEnd,
      };
    });
  }

  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug:slug,
        isDeleted: false
       },
      include: { variants: true, category: true },
    });

    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm này.`);

    const { price, discount, promoStart, promoEnd, variants, ...rest } = product;

    const modifiedVariants = variants.map(v => {
      const sizeBasePrice = this.calculateSizePrice(
        price, 
        v.sizeValue, 
        product.sizeIncreaseThreshold, 
        product.sizeIncreasePercentage
      );

      const promo = this.applyPromotion(sizeBasePrice, discount, promoStart, promoEnd);

      return {
        ...v,
        originalVariantPrice: parseFloat(sizeBasePrice.toFixed(2)), 
        calculatedPrice: promo.currentPrice, 
        isSale: promo.isSale
      };
    });

    const mainPromo = this.applyPromotion(price, discount, promoStart, promoEnd);

    return {
      ...rest,
      price, 
      currentPrice: mainPromo.currentPrice,
      isSale: mainPromo.isSale,
      promoName: mainPromo.isSale ? product.promoName : null,
      promoEnd: product.promoEnd, 
      variants: modifiedVariants
    };
  }
  async findById(id: number) {
  const product = await this.prisma.product.findUnique({
    where: { id: id, isDeleted: false }, // Tìm bằng ID
    include: { variants: true, category: true },
  });

  if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);

  // Tái sử dụng logic tính toán giá từ hàm findOne của bạn
  const { price, discount, promoStart, promoEnd, variants, ...rest } = product;
  const modifiedVariants = variants.map(v => {
    const sizeBasePrice = this.calculateSizePrice(price, v.sizeValue, product.sizeIncreaseThreshold, product.sizeIncreasePercentage);
    const promo = this.applyPromotion(sizeBasePrice, discount, promoStart, promoEnd);
    return { ...v, originalVariantPrice: parseFloat(sizeBasePrice.toFixed(2)), calculatedPrice: promo.currentPrice, isSale: promo.isSale };
  });

  const mainPromo = this.applyPromotion(price, discount, promoStart, promoEnd);
  return { ...rest, price, currentPrice: mainPromo.currentPrice, isSale: mainPromo.isSale, promoName: mainPromo.isSale ? product.promoName : null, promoEnd: product.promoEnd, variants: modifiedVariants };
}

// backend/src/products/products.service.ts

async update(id: number, updateData: any) {
  const { variants: incomingVariants, ...productFields } = updateData;
  
  // 1. Chuẩn hóa dữ liệu sản phẩm cha
  if (productFields.price) productFields.price = parseFloat(productFields.price.toString());
  if (productFields.discount !== undefined) productFields.discount = parseFloat(productFields.discount.toString());
  if (productFields.promoStart) productFields.promoStart = productFields.promoStart ? new Date(productFields.promoStart) : null;
  if (productFields.promoEnd) productFields.promoEnd = productFields.promoEnd ? new Date(productFields.promoEnd) : null;
  if (productFields.categoryId) productFields.categoryId = Number(productFields.categoryId);

  const transactionOps: Prisma.PrismaPromise<any>[] = [];

  if (incomingVariants) {
  const existingVariants = await this.prisma.productVariant.findMany({ where: { productId: id } });
  const existingIds = existingVariants.map(v => v.id);
  const keepIds = incomingVariants.filter((v: any) => v.id).map((v: any) => v.id);
  const toDelete = existingIds.filter(eid => !keepIds.includes(eid));

  if (toDelete.length > 0) {
    transactionOps.push(this.prisma.productVariant.deleteMany({ where: { id: { in: toDelete } } }));
  }

  incomingVariants.forEach((v: any) => {
    // TẠO OBJECT DỮ LIỆU SẠCH (Chỉ lấy đúng những gì ProductVariant cần)
    const variantData = {
      sizeValue: String(v.sizeValue),
      color: v.color || "",
      stock: parseInt(v.stock.toString()) || 0,
      sku: v.sku || `SKU-${Date.now()}-${Math.random().toString(36).substring(7)}`
    };

    if (v.id && existingIds.includes(Number(v.id))) {
      // CẬP NHẬT
      transactionOps.push(this.prisma.productVariant.update({
        where: { id: Number(v.id) },
        data: variantData, // Không dùng ...v
      }));
    } else if (!v.id || (typeof v.id === 'string' && v.id.startsWith('temp-'))) {
      // TẠO MỚI
      transactionOps.push(this.prisma.productVariant.create({
        data: { 
          ...variantData, // Chỉ dùng dữ liệu sạch
          productId: id 
        },
      }));
    }
  });
}
  // Cập nhật thông tin sản phẩm cha
  transactionOps.push(this.prisma.product.update({
    where: { id },
    data: productFields,
    include: { variants: true, category: true },
  }));

  const results = await this.prisma.$transaction(transactionOps);
  return results[results.length - 1];
}
 async remove(id: number) {
  // 1. Tìm sản phẩm hiện tại để lấy tên và slug cũ
  const product = await this.prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

  // 2. Cập nhật trạng thái "đã xóa" và đổi tên/slug để tránh trùng lặp sau này
  return this.prisma.product.update({
    where: { id },
    data: {
      isDeleted: true,
      name: `${product.name} (deleted-${Date.now()})`,
      slug: `${product.slug}-deleted-${Date.now()}`
    },
  });
}

  // =========================================
  // 2. LOGIC KHUYẾN MÃI TOÀN SÀN (MỚI)
  // =========================================

  async applyGlobalPromotion(data: { promoName: string; discountPercent: number; endDate: string }) {
    // Cập nhật đồng loạt toàn bộ bảng Product qua Prisma
    return this.prisma.product.updateMany({
      data: {
        promoName: data.promoName || 'GIẢM GIÁ TOÀN SÀN',
        discount: parseFloat(data.discountPercent.toString()),
        promoStart: new Date(), // Bắt đầu luôn
        promoEnd: data.endDate ? new Date(data.endDate) : null,
      },
    });
  }

  // =========================================
  // 3. BÁO CÁO KHO (GIỮ NGUYÊN)
  // =========================================

  async updateVariantStock(variantId: number, newStock: number) {
    if (newStock < 0) throw new BadRequestException('Stock không thể âm.');
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: newStock },
    });
  }

  async getLowStockItems({ threshold, categoryId, limit }: LowStockFilter) {
    const where: Prisma.ProductVariantWhereInput = { stock: { lte: threshold } };
    if (categoryId) where.product = { categoryId };

    return this.prisma.productVariant.findMany({
      where,
      select: { id: true, stock: true, sizeValue: true, product: { select: { name: true, slug: true } } },
      orderBy: { stock: 'asc' },
      take: limit,
    });
  }
}