-- AlterTable
ALTER TABLE "Aula" DROP COLUMN "driveFileId",
DROP COLUMN "driveLink",
DROP COLUMN "videoPath",
ADD COLUMN     "blobPathname" TEXT,
ALTER COLUMN "videoUrl" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Aula_blobPathname_key" ON "Aula"("blobPathname");

-- AlterTable (default status agora READY)
ALTER TABLE "Aula" ALTER COLUMN "status" SET DEFAULT 'READY';