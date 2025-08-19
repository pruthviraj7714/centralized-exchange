/*
  Warnings:

  - You are about to drop the column `buyOrderId` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `sellOrderId` on the `Trade` table. All the data in the column will be lost.
  - Added the required column `askId` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bidId` to the `Trade` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Trade" DROP CONSTRAINT "Trade_buyOrderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Trade" DROP CONSTRAINT "Trade_sellOrderId_fkey";

-- AlterTable
ALTER TABLE "public"."Trade" DROP COLUMN "buyOrderId",
DROP COLUMN "sellOrderId",
ADD COLUMN     "askId" TEXT NOT NULL,
ADD COLUMN     "bidId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_askId_fkey" FOREIGN KEY ("askId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
