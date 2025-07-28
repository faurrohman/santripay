/*
  Warnings:

  - The values [naik_kelas] on the enum `JenisNotifikasi` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JenisNotifikasi_new" AS ENUM ('tagihan_baru', 'tagihan_jatuh_tempo', 'pembayaran_diterima', 'pembayaran_ditolak', 'saldo_berkurang', 'saldo_bertambah', 'pembayaran_baru', 'pembayaran_menunggu', 'pembayaran_ditolak_admin', 'tagihan_jatuh_tempo_admin', 'sistem');
ALTER TABLE "notifikasi" ALTER COLUMN "type" TYPE "JenisNotifikasi_new" USING ("type"::text::"JenisNotifikasi_new");
ALTER TYPE "JenisNotifikasi" RENAME TO "JenisNotifikasi_old";
ALTER TYPE "JenisNotifikasi_new" RENAME TO "JenisNotifikasi";
DROP TYPE "JenisNotifikasi_old";
COMMIT;

-- CreateTable
CREATE TABLE "RiwayatKelas" (
    "id" TEXT NOT NULL,
    "santriId" TEXT NOT NULL,
    "kelasLamaId" TEXT NOT NULL,
    "kelasBaruId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiwayatKelas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiwayatKelas_santriId_idx" ON "RiwayatKelas"("santriId");

-- CreateIndex
CREATE INDEX "RiwayatKelas_kelasLamaId_idx" ON "RiwayatKelas"("kelasLamaId");

-- CreateIndex
CREATE INDEX "RiwayatKelas_kelasBaruId_idx" ON "RiwayatKelas"("kelasBaruId");

-- AddForeignKey
ALTER TABLE "RiwayatKelas" ADD CONSTRAINT "RiwayatKelas_santriId_fkey" FOREIGN KEY ("santriId") REFERENCES "santri"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiwayatKelas" ADD CONSTRAINT "RiwayatKelas_kelasLamaId_fkey" FOREIGN KEY ("kelasLamaId") REFERENCES "kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiwayatKelas" ADD CONSTRAINT "RiwayatKelas_kelasBaruId_fkey" FOREIGN KEY ("kelasBaruId") REFERENCES "kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
