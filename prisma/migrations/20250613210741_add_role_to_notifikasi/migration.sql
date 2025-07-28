-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JenisNotifikasi" ADD VALUE 'pembayaran_baru';
ALTER TYPE "JenisNotifikasi" ADD VALUE 'pembayaran_menunggu';
ALTER TYPE "JenisNotifikasi" ADD VALUE 'pembayaran_ditolak_admin';
ALTER TYPE "JenisNotifikasi" ADD VALUE 'tagihan_jatuh_tempo_admin';

-- AlterTable
ALTER TABLE "notifikasi" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'santri';
