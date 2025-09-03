/*
  Warnings:

  - Added the required column `marketId` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Trade" ADD COLUMN     "marketId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "public"."Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
