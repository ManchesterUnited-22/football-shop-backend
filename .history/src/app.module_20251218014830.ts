import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoryModule } from './category/category.module';
import { OrderModule } from './order/order.module';
import { ReportModule } from './report/report.module';
import { NotificationsModule} from 
// 1. Import EventEmitterModule
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // 2. Khai báo EventEmitterModule để dùng toàn cục
    EventEmitterModule.forRoot(), 
    ProductsModule,
    PrismaModule,
    CloudinaryModule,
    AuthModule,
    UsersModule,
    CategoryModule,
    OrderModule,
    ReportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}