// backend/src/products/products.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CategoryService } from 'src/category/category.service';
import { Prisma, ProductVariant, SizeType } from '@prisma/client';

// =========================================================
// INTERFACES & TYPES
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
// HELPER: LOGIC TÍNH GIÁ DỰA TRÊN SIZE (FLOAT SAFE)
// =========================================================
function calculateSizePrice(basePrice: number, sizeValue: string, threshold: string, percentage: number): number {
  if (!basePrice || !percentage || !threshold) return basePrice;
  
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
  return finalBase;
}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private categoryService: CategoryService,
  ) {}

  // =========================================
  // HELPER: TÍNH TOÁN KHUYẾN MẠI THỜI GIAN THỰC
  // =========================================
  private applyPromotion(price: number, discount: number, start: Date, end: Date) {
    const now = new Date();
    // Kiểm tra xem hiện tại có nằm trong khoảng Start và End không
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
  // 1. TẠO SẢN PHẨM MỚI
  // =========================================
  async create(createProductDto: any, userId: number) {
    const { 
      name, price, description, categoryId, sizeType, sizeOptions, 
      sizeIncreaseThreshold, sizeIncreasePercentage, images,
      variants: incomingVariants,
      discount, promoStart, promoEnd, promoName 
    } = createProductDto;

    // Kiểm tra trùng tên
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
        // Dữ liệu khuyến mại
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
  // 2. LẤY TẤT CẢ SẢN PHẨM (DÙNG CHO TRANG CHỦ)
  // =========================================
  async findAll(filters: ProductFilters) {
    const where: any = {};
    const orderBy: any = {};

    if (filters.categoryId) where.categoryId = Number(filters.categoryId);
    
    // Tìm kiếm tương đối (Fuzzy Search)
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    // Lọc theo khoảng giá gốc
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

    // Map dữ liệu để trả về giá hiện tại (đã giảm hoặc chưa)
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
  // 3. CHI TIẾT SẢN PHẨM (XỬ LÝ GIÁ SIZE + SALE)
  // =========================================
  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { variants: true, category: true },
    });

    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm này.`);

    const { price, discount, promoStart, promoEnd, variants, ...rest } = product;

    // Xử lý từng Variant (Size)
    const modifiedVariants = variants.map(v => {
      // 1. Tính giá gốc của Size đó (nếu là size lớn thì tăng giá)
      const sizeBasePrice = calculateSizePrice(
        price, 
        v.sizeValue, 
        product.sizeIncreaseThreshold, 
        product.sizeIncreasePercentage
      );

      // 2. Áp dụng giảm giá lên mức giá đã tăng do size
      const promo = this.applyPromotion(sizeBasePrice, discount, promoStart, promoEnd);

      return {
        ...v,
        originalVariantPrice: parseFloat(sizeBasePrice.toFixed(2)), 
        calculatedPrice: promo.currentPrice, 
        isSale: promo.isSale
      };
    });

    // Tính toán giá đại diện cho sản phẩm chính
    const mainPromo = this.applyPromotion(price, discount, promoStart, promoEnd);

    return {
      ...rest,
      price, // Giá gốc (chưa tăng size, chưa giảm giá)
      currentPrice: mainPromo.currentPrice,
      isSale: mainPromo.isSale,
      promoName: mainPromo.isSale ? product.promoName : null,
      promoEnd: product.promoEnd, // Trả về ngày kết thúc để làm đồng hồ đếm ngược ở Frontend
      variants: modifiedVariants
    };
  }

  // =========================================
  // 4. CẬP NHẬT SẢN PHẨM (CÓ TRANSACTION)
  // =========================================
  async update(id: number, updateData: any) {
    const { variants: incomingVariants, ...productFields } = updateData;
    
    // Ép kiểu các trường dữ liệu
    if (productFields.price) productFields.price = parseFloat(productFields.price.toString());
    if (productFields.discount !== undefined) productFields.discount = parseFloat(productFields.discount.toString());
    if (productFields.promoStart) productFields.promoStart = new Date(productFields.promoStart);
    if (productFields.promoEnd) productFields.promoEnd = new Date(productFields.promoEnd);

    const transactionOps: Prisma.PrismaPromise<any>[] = [];

    // Xử lý logic cập nhật Variants (giữ nguyên logic gốc của bạn)
    if (incomingVariants) {
      const existingVariants = await this.prisma.productVariant.findMany({ where: { productId: id } });
      const existingIds = existingVariants.map(v => v.id);
      
      const keepIds = incomingVariants.filter(v => v.id).map(v => v.id);
      const toDelete = existingIds.filter(eid => !keepIds.includes(eid));

      if (toDelete.length > 0) {
        transactionOps.push(this.prisma.productVariant.deleteMany({ where: { id: { in: toDelete } } }));
      }

      incomingVariants.forEach(v => {
        if (v.id && existingIds.includes(v.id)) {
          transactionOps.push(this.prisma.productVariant.update({
            where: { id: v.id },
            data: { sizeValue: v.sizeValue, color: v.color, stock: v.stock, sku: v.sku },
          }));
        } else if (!v.id) {
          transactionOps.push(this.prisma.productVariant.create({
            data: { ...v, productId: id, sku: v.sku || `SKU-${Date.now()}` },
          }));
        }
      });
    }

    // Cập nhật thông tin chính của sản phẩm
    transactionOps.push(this.prisma.product.update({
      where: { id },
      data: productFields,
      include: { variants: true, category: true },
    }));

    const results = await this.prisma.$transaction(transactionOps);
    return results[results.length - 1];
  }

  // =========================================
  // 5. CÁC HÀM TIỆN ÍCH KHÁC
  // =========================================
  async remove(id: number) {
    await this.prisma.productVariant.deleteMany({ where: { productId: id } });
    return this.prisma.product.delete({ where: { id } });
  }

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