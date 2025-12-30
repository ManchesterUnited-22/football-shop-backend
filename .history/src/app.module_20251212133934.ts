import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { PrismaModule } from '/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryModule } from './cloudinary/cloudinary.module'; // 👈 IMPORT DÒNG NÀY
import { AuthModule } from './auth/auth.module'; // Thêm dòng này
import { UsersModule } from './users/users.module'; // Thêm dòng này
import { CategoryModule } from './category/category.module'; // ⭐️ Import CategoryModule
import { OrderModule } from './order/order.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ProductsModule,
    PrismaModule,
    CloudinaryModule, // 👈 THÊM VÀO ĐÂY
    AuthModule,
    UsersModule,
    CategoryModule,
    OrderModule,
    ReportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
}
)export class AppModule {}


