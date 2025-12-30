import * as multer from 'multer';

export const multerConfig = {
  storage: multer.memoryStorage(), // lưu file vào RAM
  limits: {
    fileSize: 5 * 1024 * 1024, // giới hạn 5MB
  },
};
