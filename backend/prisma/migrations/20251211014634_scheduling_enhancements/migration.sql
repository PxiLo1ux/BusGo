-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SCHEDULE_UPDATE';

-- AlterEnum
ALTER TYPE "ScheduleStatus" ADD VALUE 'DELAYED';

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "dailyScheduleId" TEXT,
ADD COLUMN     "delayMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "delayReason" TEXT,
ADD COLUMN     "originalDepartureTime" TIMESTAMP(3);
