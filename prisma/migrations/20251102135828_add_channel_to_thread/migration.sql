/*
  Warnings:

  - A unique constraint covering the columns `[contactId,channel]` on the table `threads` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "threads" ADD COLUMN     "channel" TEXT NOT NULL DEFAULT 'sms';

-- CreateIndex
CREATE UNIQUE INDEX "threads_contactId_channel_key" ON "threads"("contactId", "channel");
