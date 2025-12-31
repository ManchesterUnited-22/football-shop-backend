import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ CẤU HÌNH CORS: 
  // Để linh hoạt nhất, mình cho phép tất cả các nguồn (hoặc giữ nguyên localhost:3000 của bạn)
  app.enableCors({
    origin: 'https://4foobtall.vercel.app/', // Sau này khi bạn deploy Frontend, hãy thay '*' bằng link Frontend thật
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