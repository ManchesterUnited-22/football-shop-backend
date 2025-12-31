import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ CẤU HÌNH CORS: 
  // Để linh hoạt nhất, mình cho phép tất cả các nguồn (hoặc giữ nguyên localhost:3000 của bạn)
  app.enableCors({
   origin: [
    'https://4football.vercel.app',   // Link trang web thật của bạn
    'http://localhost:3000',           // Link khi bạn code ở máy (Next.js)
    'http://localhost:3001',           // Link dự phòng khác nếu có
  ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // ✅ CHỈNH PORT: Quan trọng nhất để chạy trên Cloud
  // Nó sẽ lấy cổng do Koyeb cấp, nếu không thấy thì mới dùng 3001
  const port = process.env.PORT || 3001;
  
  await app.listen(port); 
  console.log(`Backend is running on port: ${port}`);
}
bootstrap();