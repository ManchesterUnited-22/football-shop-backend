// backend/src/products/products.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from 'src/multer.config';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

// DTO nhanh cho việc cập nhật tồn kho
class UpdateStockDto {
  stock: number;
}

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ==========================================
  // 1. QUẢN LÝ MEDIA (UPLOAD)
  // ==========================================
  @Post('upload')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng cung cấp file ảnh.');
    }
    const uploadResult = await this.cloudinaryService.uploadFile(file);
    return {
      url: uploadResult.secure_url,
      message: 'Tải lên ảnh thành công.',
    };
  }

  // ==========================================
  // 2. CÁC THAO TÁC ĐỌC (PUBLIC)
  // ==========================================

  // Lấy danh sách sản phẩm với bộ lọc nâng cao
  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('isSale') isSale?: string, // Lọc sản phẩm đang giảm giá
  ) {
    const filters = {
      q,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy,
      sortOrder,
      isSale: isSale === 'true', // Chuyển từ string query sang boolean
    };
    return this.productsService.findAll(filters);
  }

  // Lấy chi tiết sản phẩm theo Slug (để SEO tốt hơn)
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug);
  }

  // ==========================================
  // 3. CÁC THAO TÁC GHI (ADMIN ONLY)
  // ==========================================

  // Tạo sản phẩm mới
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() createProductDto: CreateProductDto, @Req() req: any) {
    // userId được lấy từ Token đã qua kiểm tra của AuthGuard
    return this.productsService.create(createProductDto, Number(req.user.id));
  }

  // Cập nhật toàn bộ thông tin sản phẩm
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: any, // Nên thay bằng UpdateProductDto nếu có
  ) {
    return this.productsService.update(id, updateData);
  }

  // Cập nhật nhanh số lượng tồn kho của một biến thể
  @Patch('variant/:id/stock')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async updateVariantStock(
    @Param('id', ParseIntPipe) variantId: number,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.productsService.updateVariantStock(variantId, updateStockDto.stock);
  }

  // Xóa sản phẩm
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}