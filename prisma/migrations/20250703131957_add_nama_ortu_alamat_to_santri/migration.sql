/*
  Warnings:

  - Made the column `orderId` on table `transaksi` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "santri" ADD COLUMN     "alamat" TEXT,
ADD COLUMN     "namaBapak" TEXT,
ADD COLUMN     "namaIbu" TEXT;

-- AlterTable
ALTER TABLE "transaksi" ALTER COLUMN "orderId" SET NOT NULL;
