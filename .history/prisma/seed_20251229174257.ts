// prisma/seed.ts (PHIÊN BẢN ĐÃ SỬA)

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  n Admin...');

  // 1. ĐỊNH NGHĨA DỮ LIỆU MỚI BẠN MUỐN DÙNG
  const adminEmail = 'lapnv.24it@vku.udn.vn'; // ✅ EMAIL MỚI
  const rawPassword = '220506vku';           // ✅ PASSWORD MỚI
  const adminFullName = 'administrator';      // ✅ FULL NAME MỚI
  
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  // 2. Kiểm tra xem Admin đã tồn tại chưa (Dùng email mới)
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }, // ✅ Kiểm tra email mới
  });

  if (existingAdmin) {
    console.log(`Tài khoản Admin (${adminEmail}) đã tồn tại. Bỏ qua.`);
    return;
  }

  // 3. Tạo tài khoản Admin mới
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail, // ✅ Sử dụng email mới
      password: hashedPassword,
      fullName: adminFullName, // ✅ Sử dụng tên mới
      role: Role.ADMIN, 
    },
  });

  console.log(`✅ Tạo Admin thành công: ${adminUser.email}`);
  console.log(`Mật khẩu (thô): ${rawPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi chạy Seed Script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });