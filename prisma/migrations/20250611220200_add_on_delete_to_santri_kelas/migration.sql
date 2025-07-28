/*
  Warnings:

  - You are about to drop the column `created_at` on the `santri` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `santri` table. All the data in the column will be lost.
  - You are about to alter the column `phone` on the `santri` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(15)`.
  - Added the required column `updatedAt` to the `santri` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "santri" DROP CONSTRAINT "santri_kelas_id_fkey";

-- DropForeignKey
ALTER TABLE "santri" DROP CONSTRAINT "santri_user_id_fkey";

-- AlterTable
ALTER TABLE "santri" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(15);

-- AddForeignKey
ALTER TABLE "santri" ADD CONSTRAINT "santri_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "santri" ADD CONSTRAINT "santri_kelas_id_fkey" FOREIGN KEY ("kelas_id") REFERENCES "kelas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
