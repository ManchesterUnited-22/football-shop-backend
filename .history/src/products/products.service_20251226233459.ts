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

  // Nếu size là số (Giày 38, 39, 40...)
  if (!isNaN(numThreshold) && !isNaN(numSizeValue)) {
    if (numSizeValue >= numThreshold) {
      const increaseAmount = basePrice * (percentage / 100);
      return basePrice + increaseAmount;
    }
    return basePrice;
  }

  // Nếu size là chữ (S, M, L, XL...)
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
  // 1. TẠO SẢN PHẨM MỚI
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

    // Kiểm tra Category
    if (categoryId) {
      const categoryExists = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!categoryExists) throw new NotFoundException(`Category ID ${categoryId} không tồn tại.`);
    }

    // Kiểm tra trùng tên
    const existingProduct = await this.prisma.product.findFirst({ where: { name } });
    if (existingProduct) throw new BadRequestException('Sản phẩm với tên này đã tồn tại.');

    // Tạo Slug
    const cleanedName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''); 
    const productSlug = `${cleanedName}-${Date.now()}`;

    let variantData: any[] = [];

    // Case 1: Phụ kiện (Mặc định ONESIZE)
    if (categoryId === 3 && (!incomingVariants || incomingVariants.length === 0)) {
      variantData = [{
        sizeValue: 'ONESIZE',
        stock: 9999,
        color: 'Default',
        sku: `${name.substring(0, 3).toUpperCase()}-OS-DEF`, 
      }];
    } 
    // Case 2: Đã có variants gửi kèm
    else if (incomingVariants && incomingVariants.length > 0) {
      variantData = incomingVariants.map(v => ({
        sizeValue: v.sizeValue,
        stock: v.stock,
        color: v.color,
        sku: v.sku || `${name.substring(0, 3).toUpperCase()}-${v.sizeValue}`, 
      }));
    }
    // Case 3: Tách từ chuỗi sizeOptions
    else if (sizeType !== 'NONE' && sizeOptions) {
      const sizes = sizeOptions.split(',').map(s => s.trim()).filter(s => s.length > 0);
      variantData = sizes.map(size => ({
        sizeValue: size,
        stock: 0, 
        sku: `${name.substring(0, 3).toUpperCase()}-${size}`, 
      }));
    }

    try {
      return await this.prisma.product.create({
        data: {
          name,
          slug: productSlug,
          description,
          price: parseFloat(price.toString()), // Đảm bảo lưu kiểu Float
          images: images || [],
          categoryId: categoryId || null,
          userId: userId,
          sizeType: sizeType,
          sizeIncreaseThreshold: sizeIncreaseThreshold || null,
          sizeIncreasePercentage: sizeIncreasePercentage !== undefined ? parseFloat(sizeIncreasePercentage.toString()) : null,
          variants: variantData.length > 0 ? { createMany: { data: variantData } } : undefined,
        },
        include: { category: true, variants: true },
      });
    } catch (e) {
      console.error("[PRISMA CREATE ERROR]: ", e); 
      throw new BadRequestException('Lỗi khi lưu dữ liệu sản phẩm.');
    }
  }

  // =========================================
  // 2. LẤY TẤT CẢ SẢN PHẨM (BỘ LỌC CHÍNH)
  // =========================================
  async findAll(filters: ProductFilters) {
    const where: any = {};
    const orderBy: any = {};

    // Lọc theo Category
    if (filters.categoryId) {
      where.categoryId = Number(filters.categoryId);
    }

    // LỌC THEO GIÁ (FLOAT SAFE)
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined && filters.minPrice !== null) {
        const min = parseFloat(filters.minPrice.toString());
        if (!isNaN(min)) where.price.gte = min;
      }
      if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
        const max = parseFloat(filters.maxPrice.toString());
        if (!isNaN(max)) where.price.lte = max;
      }
    }

    // Tìm kiếm từ khóa
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    // Sắp xếp
    if (filters.sortBy && filters.sortOrder) {
      const validSortFields = ['price', 'createdAt', 'name'];
      if (validSortFields.includes(filters.sortBy)) {
        orderBy[filters.sortBy] = filters.sortOrder;
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

  // =========================================
  // 3. LẤY CHI TIẾT THEO SLUG (CÓ TÍNH GIÁ SIZE)
  // =========================================
  async findOne(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { variants: true, category: true },
    });

    if (!product) throw new NotFoundException(`Không tìm thấy sản phẩm slug: ${slug}`);

    const { price, sizeType, sizeIncreaseThreshold, sizeIncreasePercentage, variants, ...productData } = product;

    if (sizeType !== SizeType.NONE && sizeIncreaseThreshold && sizeIncreasePercentage !== null) {
      const modifiedVariants = variants.map(variant => ({
        ...variant,
        calculatedPrice: calculateFinalPrice(
          price,
          variant.sizeValue,
          sizeIncreaseThreshold,
          sizeIncreasePercentage
        ),
      }));

      return { ...productData, price, variants: modifiedVariants, sizeType, sizeIncreaseThreshold, sizeIncreasePercentage };
    }

    return product;
  }

  // =========================================
  // 4. CẬP NHẬT SẢN PHẨM (TRANSACTION)
  // =========================================
  async update(id: number, updateData: any) {
    const { variants: incomingVariants, ...productData } = updateData;
    const finalUpdateData: any = {};

    const currentProduct = await this.prisma.product.findUnique({ where: { id } });
    if (!currentProduct) throw new NotFoundException(`Không thấy sản phẩm ID ${id}`);

    // Xử lý Name & Slug
    if (productData.name && productData.name !== currentProduct.name) {
      finalUpdateData.name = productData.name;
      finalUpdateData.slug = `${productData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')}-${Date.now()}`;
    }

    // Cập nhật các trường Float
    if (productData.price !== undefined) finalUpdateData.price = parseFloat(productData.price.toString());
    if (productData.sizeIncreasePercentage !== undefined) 
        finalUpdateData.sizeIncreasePercentage = parseFloat(productData.sizeIncreasePercentage.toString());

    // Các trường khác
    if (productData.description !== undefined) finalUpdateData.description = productData.description;
    if (productData.categoryId !== undefined) finalUpdateData.categoryId = productData.categoryId;
    if (productData.images !== undefined) finalUpdateData.images = productData.images;
    if (productData.sizeType !== undefined) finalUpdateData.sizeType = productData.sizeType;
    if (productData.sizeIncreaseThreshold !== undefined) finalUpdateData.sizeIncreaseThreshold = productData.sizeIncreaseThreshold;

    const transactionOps: Prisma.PrismaPromise<any>[] = [];

    // Xử lý Variants nếu có
    if (incomingVariants) {
      const existingVariants = await this.prisma.productVariant.findMany({ where: { productId: id } });
      const existingIds = existingVariants.map(v => v.id);
      const incomingList = incomingVariants as UpdateProductVariantDto[];

      const keepIds = incomingList.filter(v => v.id).map(v => v.id);
      const toDelete = existingIds.filter(id => !keepIds.includes(id));

      if (toDelete.length > 0) {
        transactionOps.push(this.prisma.productVariant.deleteMany({ where: { id: { in: toDelete } } }));
      }

      incomingList.forEach(v => {
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

    transactionOps.push(this.prisma.product.update({
      where: { id },
      data: finalUpdateData,
      include: { variants: true, category: true },
    }));

    const results = await this.prisma.$transaction(transactionOps);
    return results[results.length - 1];
  }

  // =========================================
  // 5. CÁC HÀM HỖ TRỢ KHÁC
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