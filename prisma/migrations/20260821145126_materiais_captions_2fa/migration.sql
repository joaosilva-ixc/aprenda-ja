-- AlterTable
ALTER TABLE "Aula" ADD COLUMN     "captionsVtt" TEXT,
ADD COLUMN     "chapters" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "recoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT;

-- CreateTable
CREATE TABLE "AulaMaterial" (
    "id" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "contentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AulaMaterial_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AulaMaterial" ADD CONSTRAINT "AulaMaterial_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula"("id") ON DELETE CASCADE ON UPDATE CASCADE;
