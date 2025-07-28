-- DropForeignKey
ALTER TABLE "tagihan" DROP CONSTRAINT "tagihan_santri_id_fkey";

-- AlterTable
ALTER TABLE "notifikasi" ADD COLUMN     "tagihan_id" TEXT;

-- AddForeignKey
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_santri_id_fkey" FOREIGN KEY ("santri_id") REFERENCES "santri"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_tagihan_id_fkey" FOREIGN KEY ("tagihan_id") REFERENCES "tagihan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
