/*
  Warnings:

  - Changed the type of `openTime` on the `Candle` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `closeTime` on the `Candle` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Candle" DROP COLUMN "openTime",
ADD COLUMN     "openTime" INTEGER NOT NULL,
DROP COLUMN "closeTime",
ADD COLUMN     "closeTime" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Candle_market_interval_openTime_idx" ON "Candle"("market", "interval", "openTime");

-- CreateIndex
CREATE UNIQUE INDEX "Candle_market_interval_openTime_key" ON "Candle"("market", "interval", "openTime");
