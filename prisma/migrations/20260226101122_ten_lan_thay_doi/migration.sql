-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "color" TEXT,
ADD COLUMN     "completedToday" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estimatedTime" INTEGER,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "lastCompletedAt" TIMESTAMP(3),
ADD COLUMN     "streak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "HabitActivity" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HabitActivity_habitId_idx" ON "HabitActivity"("habitId");

-- CreateIndex
CREATE INDEX "HabitActivity_date_idx" ON "HabitActivity"("date");

-- CreateIndex
CREATE UNIQUE INDEX "HabitActivity_habitId_date_key" ON "HabitActivity"("habitId", "date");

-- AddForeignKey
ALTER TABLE "HabitActivity" ADD CONSTRAINT "HabitActivity_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
