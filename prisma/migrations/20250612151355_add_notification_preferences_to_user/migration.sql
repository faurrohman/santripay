-- AlterTable
ALTER TABLE "users" ADD COLUMN     "receive_app_notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "receive_email_notifications" BOOLEAN NOT NULL DEFAULT true;
