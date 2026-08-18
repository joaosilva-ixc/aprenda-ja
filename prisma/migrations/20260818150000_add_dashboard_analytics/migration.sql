-- AlterTable
ALTER TABLE "Aula" ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastAccessAt" TIMESTAMP(3);