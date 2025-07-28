-- AlterEnum
ALTER TYPE "JenisNotifikasi" ADD VALUE 'naik_kelas';

-- DropForeignKey
ALTER TABLE "tagihan" DROP CONSTRAINT "tagihan_tahunAjaranId_fkey";

-- AlterTable
ALTER TABLE "tagihan" ALTER COLUMN "tahunAjaranId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;
