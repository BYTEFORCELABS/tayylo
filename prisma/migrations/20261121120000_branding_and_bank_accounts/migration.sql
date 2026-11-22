-- AlterTable
ALTER TABLE "Business" ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "bankAccounts" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "bankAccountId" TEXT;
