import { Controller, Get, Post, Body, Delete, Param, UseGuards, ParseIntPipe, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { CategoryService } from './category.service';
import type { Category } from '@prisma/client'; // 👈 dùng import type để tránh TS1272
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto'; 
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('categories')
@UseGuards(AuthGuard, RolesGuard) 
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCategoryDto: CreateCategoryDto): Category {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  findAll(): Category[] {
    return this.categoryService.findAll();
  }
  
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Category {
    return this.categoryService.findOne(id);
  }
  
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: UpdateCategoryDto): Category {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): { message: string } {
    return this.categoryService.remove(id);
  }
}
