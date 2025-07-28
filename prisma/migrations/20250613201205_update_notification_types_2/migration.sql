/*
  Warnings:

  - The values [pembayaran_baru,pembayaran_ditolak,pembayaran_diterima,tagihan_baru,tagihan_diupdate,tagihan_dihapus,sistem_admin,tagihan_baru_santri,tagihan_jatuh_tempo,pembayaran_diterima_santri,pembayaran_ditolak_santri,tagihan_diupdate_santri,sistem_santri] on the enum `JenisNotifikasi` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JenisNotifikasi_new" AS ENUM ('admin_pembayaran_baru', 'admin_pembayaran_ditolak', 'admin_pembayaran_diterima', 'admin_tagihan_baru', 'admin_tagihan_diupdate', 'admin_tagihan_dihapus', 'admin_sistem', 'santri_tagihan_baru', 'santri_tagihan_jatuh_tempo', 'santri_pembayaran_diterima', 'santri_pembayaran_ditolak', 'santri_tagihan_diupdate', 'santri_sistem');
ALTER TABLE "notifikasi" ALTER COLUMN "type" TYPE "JenisNotifikasi_new" USING ("type"::text::"JenisNotifikasi_new");
ALTER TYPE "JenisNotifikasi" RENAME TO "JenisNotifikasi_old";
ALTER TYPE "JenisNotifikasi_new" RENAME TO "JenisNotifikasi";
DROP TYPE "JenisNotifikasi_old";
COMMIT;
