/*
  Warnings:

  - Added the required column `tahunAjaranId` to the `kelas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "kelas" ADD COLUMN     "tahunAjaranId" TEXT;

-- CreateTable
CREATE TABLE "TahunAjaran" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TahunAjaran_pkey" PRIMARY KEY ("id")
);

-- Tambah tahun ajaran default
INSERT INTO "TahunAjaran" ("id", "name", "aktif", "createdAt", "updatedAt")
VALUES ('default-tahun-ajaran', '2023/2024', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Update semua kelas lama agar punya tahunAjaranId
UPDATE "kelas" SET "tahunAjaranId" = 'default-tahun-ajaran' WHERE "tahunAjaranId" IS NULL;

-- Ubah jadi NOT NULL setelah semua data terisi
ALTER TABLE "kelas" ALTER COLUMN "tahunAjaranId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_tahunAjaranId_fkey" FOREIGN KEY ("tahunAjaranId") REFERENCES "TahunAjaran"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
