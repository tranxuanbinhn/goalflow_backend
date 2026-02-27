-- CreateTable
CREATE TABLE "Completion" (
    "id" TEXT NOT NULL,
    "habitId" TEXT,
    "taskId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Completion_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Completion_habitId_idx" ON "Completion"("habitId");
CREATE INDEX "Completion_taskId_idx" ON "Completion"("taskId");
CREATE INDEX "Completion_completedAt_idx" ON "Completion"("completedAt");

-- Foreign keys
ALTER TABLE "Completion"
ADD CONSTRAINT "Completion_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Completion"
ADD CONSTRAINT "Completion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

