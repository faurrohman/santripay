/*
  Warnings:

  - Added the required column `tahunAjaranId` to the `tagihan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tagihan" ADD COLUMN     "tahunAjaranId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "tagihan" ADD CONSTRAINT "tagihan_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
