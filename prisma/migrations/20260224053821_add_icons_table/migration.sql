/*
  Warnings:

  - You are about to drop the column `icon` on the `Milestone` table. All the data in the column will be lost.
  - You are about to drop the column `icon` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `icon` on the `Vision` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Milestone" DROP COLUMN "icon",
ADD COLUMN     "iconId" TEXT;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "icon",
ADD COLUMN     "iconId" TEXT;

-- AlterTable
ALTER TABLE "Vision" DROP COLUMN "icon",
ADD COLUMN     "iconId" TEXT;

-- CreateTable
CREATE TABLE "Icon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Icon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Icon_name_key" ON "Icon"("name");

-- AddForeignKey
ALTER TABLE "Vision" ADD CONSTRAINT "Vision_iconId_fkey" FOREIGN KEY ("iconId") REFERENCES "Icon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_iconId_fkey" FOREIGN KEY ("iconId") REFERENCES "Icon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_iconId_fkey" FOREIGN KEY ("iconId") REFERENCES "Icon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
