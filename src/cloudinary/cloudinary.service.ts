// backend/src/cloudinary/cloudinary.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

// =========================================================
// KHẮC PHỤC LỖI TS2339: Định nghĩa kiểu trả về của Cloudinary
// =========================================================
export interface CloudinaryUploadResult {
    // Các trường quan trọng mà Cloudinary trả về
    secure_url: string; 
    public_id: string;
    version: number;
    // Thêm các trường khác nếu cần
    [key: string]: any; 
}


@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    // ===============================================
    // START: LOGIC DEBUG CONFIGURATION
    // Đây là phần mới, giúp bạn kiểm tra các biến môi trường
    // ===============================================
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    console.log("--- DEBUG CLOUDINARY CONFIG ---");
    console.log(`CLOUD_NAME: ${cloudName}`);
    // Chỉ hiển thị 4 ký tự đầu của API Key để kiểm tra, bảo mật hơn.
    console.log(`API_KEY: ${apiKey ? apiKey.substring(0, 4) + '...' : 'UNDEFINED'}`);
    console.log(`API_SECRET: ${apiSecret ? 'SET' : 'UNDEFINED'}`);
    console.log("-------------------------------");
    
    if (!cloudName || !apiKey || !apiSecret) {
        console.error("LỖI: Thiếu Biến Môi Trường Cloudinary. Hãy kiểm tra file .env!");
    }
    // ===============================================
    // END: LOGIC DEBUG CONFIGURATION

    // Cấu hình Cloudinary khi Service được khởi tạo
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  /**
   * Upload file ảnh lên Cloudinary
   * @param file Multer file (memoryStorage)
   * @returns Toàn bộ đối tượng kết quả của Cloudinary
   */
  async uploadFile(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    try {
      // Chuyển buffer thành Data URI để upload
      const dataURI = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'nextjs_store_products', // Tùy chỉnh thư mục lưu trữ
      });
      
      // Trả về toàn bộ đối tượng kết quả
      return result as CloudinaryUploadResult; 
    } catch (error) {
      // Bắt lỗi và trả về lỗi 500 kèm thông báo chi tiết từ Cloudinary
      console.error("Cloudinary Upload Error:", error);
      throw new InternalServerErrorException(`Upload Cloudinary thất bại: ${error.message}`);
    }
  }
  // ... (Các hàm khác, ví dụ: generateSignature, nếu có)
}