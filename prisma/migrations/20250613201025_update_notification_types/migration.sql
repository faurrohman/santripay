/*
  Warnings:

  - The values [saldo_berkurang,saldo_bertambah,sistem] on the enum `JenisNotifikasi` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JenisNotifikasi_new" AS ENUM ('pembayaran_baru', 'pembayaran_ditolak', 'pembayaran_diterima', 'tagihan_baru', 'tagihan_diupdate', 'tagihan_dihapus', 'sistem_admin', 'tagihan_baru_santri', 'tagihan_jatuh_tempo', 'pembayaran_diterima_santri', 'pembayaran_ditolak_santri', 'tagihan_diupdate_santri', 'sistem_santri');
ALTER TABLE "notifikasi" ALTER COLUMN "type" TYPE "JenisNotifikasi_new" USING ("type"::text::"JenisNotifikasi_new");
ALTER TYPE "JenisNotifikasi" RENAME TO "JenisNotifikasi_old";
ALTER TYPE "JenisNotifikasi_new" RENAME TO "JenisNotifikasi";
DROP TYPE "JenisNotifikasi_old";
COMMIT;
