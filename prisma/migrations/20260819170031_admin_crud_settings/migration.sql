/*
  Warnings:

  - Changed the type of `slug` on the `Theme` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Theme" ALTER COLUMN "slug" SET DATA TYPE TEXT USING ("slug"::text);

-- DropEnum
DROP TYPE "ThemeSlug";

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);
