/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `sizeValue` on the `order_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "imageUrl",
DROP COLUMN "productName",
DROP COLUMN "sizeValue";
