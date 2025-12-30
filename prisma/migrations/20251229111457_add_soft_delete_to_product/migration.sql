-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "discount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promoEnd" TIMESTAMP(3),
ADD COLUMN     "promoName" TEXT,
ADD COLUMN     "promoStart" TIMESTAMP(3);
