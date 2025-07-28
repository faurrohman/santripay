
/*
  Warnings:

  - A unique constraint covering the columns `[orderId]` on the table `transaksi` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "transaksi" ADD COLUMN     "orderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transaksi_orderId_key" ON "transaksi"("orderId");
