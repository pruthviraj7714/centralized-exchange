/*
  Warnings:

  - You are about to drop the column `marketId` on the `Candle` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[market,interval,openTime]` on the table `Candle` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `market` to the `Candle` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Candle" DROP CONSTRAINT "Candle_marketId_fkey";

-- DropIndex
DROP INDEX "Candle_marketId_interval_openTime_idx";

-- DropIndex
DROP INDEX "Candle_marketId_interval_openTime_key";

-- AlterTable
ALTER TABLE "Candle" DROP COLUMN "marketId",
ADD COLUMN     "market" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Candle_market_interval_openTime_idx" ON "Candle"("market", "interval", "openTime");

-- CreateIndex
CREATE UNIQUE INDEX "Candle_market_interval_openTime_key" ON "Candle"("market", "interval", "openTime");
