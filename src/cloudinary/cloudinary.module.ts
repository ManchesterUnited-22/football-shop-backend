import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Module({
 
  providers: [CloudinaryService],
  exports: [CloudinaryService], // Rất quan trọng, phải export để các Module khác dùng
})
export class CloudinaryModule {}