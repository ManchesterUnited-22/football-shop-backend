import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
// ✅ Đã loại bỏ import Category Entity và TypeOrmModule để khắc phục lỗi TS2307

@Module({
    // Đã loại bỏ TypeOrmModule vì chúng ta đang dùng mock data/Prisma 
    // và để tránh lỗi thiếu dependency.
    imports: [AuthModule, UsersModule],
    
    controllers: [CategoryController],
    providers: [CategoryService],
    
    // ✅ Export CategoryService để các Module khác (như ProductsModule) có thể inject và sử dụng.
    exports: [CategoryService] 
})
export class CategoryModule {}