import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Global prefix (Giữ nguyên)
  app.setGlobalPrefix('api');

  // 2. Cấu hình CORS (Đã cập nhật để linh hoạt hơn)
  app.enableCors({
    // Cho phép cả URL localhost và URL thực tế từ env
    origin: [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean),
    credentials: true,
  });

  // 3. Validation pipe (Giữ nguyên - Rất tốt cho bảo mật)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 4. Lắng nghe Port (QUAN TRỌNG: Thêm '0.0.0.0')
  const port = process.env.PORT || 3000;
  
  // Render yêu cầu server phải lắng nghe trên tất cả các địa chỉ mạng (0.0.0.0)
  // thay vì chỉ mặc định localhost (127.0.0.1)
  await app.listen(port, '0.0.0.0'); 
  
  console.log(`🚀 GoalFlow API running on port: ${port}`);
}

bootstrap();