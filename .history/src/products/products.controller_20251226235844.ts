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
  ParseIntPipe, // ✅ SỬA LỖI 1: Thêm ParseIntPipe
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
// import { ApiKeyGuard } from 'src/auth/api-key.guard'; 


// ===================================================
// ✅ SỬA LỖI 2: Định nghĩa DTO cho cập nhật tồn kho
// ===================================================
class UpdateStockDto {
    stock: number;
}

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ===========================
  // 1. ENDPOINT UPLOAD ẢNH ĐỘC LẬP
  // ===========================
  @Post('upload')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', multerConfig)) 
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log("=========================================");
    console.log("1. File nhận được (check):", file);
    console.log("=========================================");
    if (!file) {
      throw new BadRequestException('Vui lòng cung cấp file ảnh.');
    }
    const uploadResult = await this.cloudinaryService.uploadFile(file);
    
    return { 
      url: uploadResult.secure_url, 
      message: 'Tải lên ảnh thành công.' 
    }; 
  }


  // ===========================
  // 2. TẠO SẢN PHẨM MỚI (CHỈ NHẬN JSON)
  // ===========================
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(
    @Body() createProductDto: CreateProductDto, 
    @Req() req: any, 
  ) {
    return this.productsService.create(createProductDto, Number(req.user.id));
  }


  // ===========================
  // LẤY TẤT CẢ SẢN PHẨM
  // ===========================
  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
@Query('isSale') isSale?: string,
  ) {
    const filters = {
      q,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy,
      sortOrder,
isSale: isSale === 'true',
    };
    return this.productsService.findAll(filters);
  }

  // ===========================
  // LẤY SẢN PHẨM THEO SLUG
  // ===========================
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug);
  }

  // ===========================
  // CẬP NHẬT SẢN PHẨM
  // ===========================
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard) 
  @Roles(Role.ADMIN) 
  async updateProduct(
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    return this.productsService.update(+id, updateData); 
  }
  
  // ===========================
  // XÓA SẢN PHẨM
  // ===========================
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }

    // ===================================================
    // ENDPOINT NHẬP HÀNG NHANH (QUICK RESTOCK)
    // ===================================================
    @Patch('variant/:id/stock')
    @UseGuards(AuthGuard, RolesGuard)
    @Roles(Role.ADMIN) // ✅ SỬA LỖI 3: Dùng Role.ADMIN thay vì 'admin' (đã import Role)
    async updateVariantStock(
        @Param('id', ParseIntPipe) variantId: number,
        @Body() updateStockDto: UpdateStockDto,
    ) {
        // Lỗi TS2339 (updateVariantStock) sẽ được giải quyết khi bạn thêm hàm này vào ProductsService.
        return this.productsService.updateVariantStock(variantId, updateStockDto.stock);
    }
}