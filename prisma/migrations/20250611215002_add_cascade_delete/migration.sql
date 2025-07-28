-- DropForeignKey
ALTER TABLE "tagihan" DROP CONSTRAINT "tagihan_santri_id_fkey";

-- DropForeignKey
ALTER TABLE "transaksi" DROP CONSTRAINT "transaksi_santri_id_fkey";

-- AddForeignKey
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_santri_id_fkey" FOREIGN KEY ("santri_id") REFERENCES "santri"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi" ADD CONSTRAINT "transaksi_santri_id_fkey" FOREIGN KEY ("santri_id") REFERENCES "santri"("id") ON DELETE CASCADE ON UPDATE CASCADE;
