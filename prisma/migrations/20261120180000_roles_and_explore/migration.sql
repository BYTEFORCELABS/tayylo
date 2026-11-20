-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'tailor';

-- CreateTable
CREATE TABLE "StylePost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "caption" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StylePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPost" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPost_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateIndex
CREATE INDEX "StylePost_createdAt_idx" ON "StylePost"("createdAt");
CREATE INDEX "StylePost_country_idx" ON "StylePost"("country");
CREATE INDEX "StylePost_category_idx" ON "StylePost"("category");
CREATE INDEX "StylePost_authorId_idx" ON "StylePost"("authorId");
CREATE INDEX "SavedPost_postId_idx" ON "SavedPost"("postId");

-- AddForeignKey
ALTER TABLE "StylePost" ADD CONSTRAINT "StylePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "StylePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
