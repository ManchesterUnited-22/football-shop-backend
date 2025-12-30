import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ CẤU HÌNH CORS: Cho phép Frontend Next.js (cổng 3000) truy cập
  app.enableCors({
    origin: 'http://localhost:3000', // Chỉ cho phép Next.js Frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Cho phép cookie và tiêu đề authorization
  });
 app.setGlobalPrefix('api');
  // ✅ CHUYỂN CỔNG: Đổi cổng mặc định từ 3000 sang 3001 để tránh xung đột với Next.js
  await app.listen(3001); 
  console.log(`Backend is running on: ${await app.getUrl()}`);
}
bootstrap();