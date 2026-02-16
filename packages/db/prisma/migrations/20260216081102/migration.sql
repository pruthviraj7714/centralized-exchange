-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "quoteAmount" DECIMAL(65,30),
ADD COLUMN     "quoteRemaining" DECIMAL(65,30),
ADD COLUMN     "quoteSpent" DECIMAL(65,30);
