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
// import { ApiKeyGuard } from 'src/auth/api-key.guard'; // Giữ nguyên nếu bạn dùng

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ===========================
  // 1. ENDPOINT UPLOAD ẢNH ĐỘC LẬP (MỚI)
  // POST /products/upload (Khớp với Frontend mới)
  // ===========================
  @Post('upload')
  //@UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  // Tên 'file' phải khớp với formData.append('file') từ Frontend
  @UseInterceptors(FileInterceptor('file', multerConfig)) 
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log("=========================================");
    console.log("1. File nhận được (check):", file); // <== DÒNG CẦN THÊM
    console.log("=========================================");
    if (!file) {
      throw new BadRequestException('Vui lòng cung cấp file ảnh.');
    }
    // Gọi Cloudinary Service để upload
    const uploadResult = await this.cloudinaryService.uploadFile(file);
    
    // Trả về URL mà Frontend cần để lưu vào state 'images'
    return { 
      url: uploadResult.secure_url, // Đảm bảo trả về trường 'url'
      message: 'Tải lên ảnh thành công.' 
    }; 
  }


  // ===========================
  // 2. TẠO SẢN PHẨM MỚI (CHỈ NHẬN JSON)
  // POST /products
  // ===========================
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  // XÓA @UseInterceptors và @UploadedFile() vì Frontend gửi JSON
  async create(
    @Body() createProductDto: CreateProductDto, 
    @Req() req: any, 
  ) {
    // Frontend đã gửi mảng URL trong DTO (createProductDto.images)
    
    

    // Sửa tham số: Bỏ imageUrl vì nó đã nằm trong DTO
    return this.productsService.create(createProductDto, Number(req.user.id));

  }


  // ===========================
  // LẤY TẤT CẢ SẢN PHẨM (Giữ nguyên)
  // ===========================
  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const filters = {
      q,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy,
      sortOrder,
    };
    return this.productsService.findAll(filters);
  }

  // ===========================
  // LẤY SẢN PHẨM THEO SLUG (Giữ nguyên)
  // ===========================
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug);
  }

  // ===========================
  // CẬP NHẬT SẢN PHẨM (CHỈ NHẬN JSON)
  // ===========================
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard) 
  @Roles(Role.ADMIN) 
  // XÓA @UseInterceptors và @UploadedFile() vì Frontend gửi JSON
  async updateProduct(
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    // Ảnh đã được xử lý (upload riêng) hoặc nằm trong updateData
    return this.productsService.update(+id, updateData); 
  }
  
  // ===========================
  // XÓA SẢN PHẨM (CHỈ ADMIN) (Giữ nguyên)
  // ===========================
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}