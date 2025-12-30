// backend/src/products/products.module.ts

import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { CategoryModule } from 'src/category/category.module';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from '../users/users.module';
@Module({
  imports: [PrismaModule, CloudinaryModule, CategoryModule, AuthModule, UsersModule], // Mảng imports đã được sửa
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {} // 👈 CHỈ GIỮ LẠI MỘT DÒNG NÀY THÔI