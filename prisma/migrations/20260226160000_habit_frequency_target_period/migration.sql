-- CreateEnum
CREATE TYPE "HabitPeriod" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- AlterTable
ALTER TABLE "Habit"
ADD COLUMN     "frequencyTarget" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "frequencyPeriod" "HabitPeriod" NOT NULL DEFAULT 'DAY';

-- Backfill from legacy frequency enum
UPDATE "Habit"
SET "frequencyPeriod" = CASE
  WHEN "frequency" = 'DAILY' THEN 'DAY'::"HabitPeriod"
  WHEN "frequency" = 'WEEKLY' THEN 'WEEK'::"HabitPeriod"
  WHEN "frequency" = 'MONTHLY' THEN 'MONTH'::"HabitPeriod"
  ELSE 'DAY'::"HabitPeriod"
END;

