-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'sent';
