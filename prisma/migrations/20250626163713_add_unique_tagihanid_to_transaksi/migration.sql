/*
  Warnings:

  - A unique constraint covering the columns `[tagihan_id]` on the table `transaksi` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "transaksi_tagihan_id_key" ON "transaksi"("tagihan_id");
