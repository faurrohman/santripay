/*
  Warnings:

  - You are about to drop the column `receive_app_notifications` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `receive_email_notifications` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "receive_app_notifications",
DROP COLUMN "receive_email_notifications",
ADD COLUMN     "receiveAppNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "receiveEmailNotifications" BOOLEAN NOT NULL DEFAULT true;
