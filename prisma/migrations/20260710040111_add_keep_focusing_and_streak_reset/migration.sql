-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasHadStreakReset" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "keepFocusingCount" INTEGER NOT NULL DEFAULT 0;
