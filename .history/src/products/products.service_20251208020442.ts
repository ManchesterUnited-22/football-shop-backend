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
  // TẠO SẢN PHẨM MỚI (ĐÃ SỬA: Bỏ imageUrl)
  // =========================================
  // BỎ THAM SỐ imageUrl
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
      images, // Lấy mảng URL ảnh trực tiếp từ DTO
    } = createProductDto;

    // Kiểm tra Category và Trùng tên (Giữ nguyên)
    if (categoryId) {
      const categoryExists = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!categoryExists) throw new NotFoundException(`Category với ID ${categoryId} không tồn tại.`);
    }
    const existingProduct = await this.prisma.product.findFirst({ where: { name } });
    if (existingProduct) throw new BadRequestException('Sản phẩm với tên này đã tồn tại.');

    let variantData: any[] = [];

    // Xử lý Logic Tách Chuỗi Size thành Variants (Giữ nguyên)
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
   // backend/src/products/products.service.ts
// ...
// Tạo sản phẩm bằng Prisma Nested Write
try {
    return await this.prisma.product.create({ // THÊM await VÀO ĐÂY
        data: {
            name,
            
            description,
            price: price, 
            images: images || [], 
            categoryId: categoryId || null,
            userId: userId,
            sizeType: sizeType, 
            
            // ⭐️ CÁC TRƯỜNG CÓ THỂ LÀ NULL: CHUYỂN undefined/null VỀ null (Nếu Prisma schema cho phép)
            sizeIncreaseThreshold: sizeIncreaseThreshold === undefined ? null : sizeIncreaseThreshold, 
            sizeIncreasePercentage: sizeIncreasePercentage === undefined ? null : sizeIncreasePercentage, 
            
            variants: variantData.length > 0 ? { createMany: { data: variantData } } : undefined,
        },
        include: { category: true, variants: true },
    });
} catch (e) {
    // ⭐️ LOG LỖI ĐỂ TÌM RA LÝ DO THẤT BẠI
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
  // CẬP NHẬT SẢN PHẨM (ĐÃ SỬA: Bỏ newImageUrl trong tham số)
  // ====================================================
  // BỎ THAM SỐ newImageUrl
  async update(id: number, updateData: any) { 
    if (!updateData) {
      throw new BadRequestException('Update data is required');
    }

    // Lấy mảng images từ updateData (đã chứa các URL)
    const { variants: incomingVariants, ...productData } = updateData;
    const finalUpdateData: any = {};

    // 1. CHUẨN BỊ DỮ LIỆU CẬP NHẬT CHO PRODUCT CHÍNH
    if (productData.name !== undefined) finalUpdateData.name = productData.name;
    if (productData.description !== undefined) finalUpdateData.description = productData.description;
    if (productData.price !== undefined) finalUpdateData.price = productData.price;
    if (productData.categoryId !== undefined) finalUpdateData.categoryId = productData.categoryId;
    
    // Quản lý ảnh: Chỉ cần gán mảng images mới (đã được Frontend gửi lên Cloudinary và trả URL về)
    // Logic cũ: 'if (newImageUrl)' và 'else if (productData.images !== undefined)' đã được đơn giản hóa.
    if (productData.images !== undefined) {
      // Frontend đã gửi mảng URL hoàn chỉnh. Ghi đè.
      finalUpdateData.images = Array.isArray(productData.images) ? productData.images : [productData.images];
    }

    // BỔ SUNG TRƯỜNG SIZE VÀ GIÁ MỚI (Giữ nguyên)
    if (productData.sizeType !== undefined) finalUpdateData.sizeType = productData.sizeType;
    if (productData.sizeIncreaseThreshold !== undefined) finalUpdateData.sizeIncreaseThreshold = productData.sizeIncreaseThreshold;
    if (productData.sizeIncreasePercentage !== undefined) finalUpdateData.sizeIncreasePercentage = productData.sizeIncreasePercentage;

    // 2. XỬ LÝ TRƯỜNG HỢP KHÔNG CÓ VARIANTS ĐƯỢC CẬP NHẬT (Giữ nguyên)
    if (!incomingVariants) {
      return this.prisma.product.update({
        where: { id },
        data: finalUpdateData,
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
      const productName = productData.name || (await this.prisma.product.findUnique({ where: { id }, select: { name: true } }))?.name || 'PRO';
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
      data: finalUpdateData,
      include: { variants: true, category: true },
    }));

    const results = await this.prisma.$transaction(transactionOps);
    return results[results.length - 1];
  }
}