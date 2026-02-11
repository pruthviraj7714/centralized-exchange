/*
  Warnings:

  - A unique constraint covering the columns `[marketId,interval,openTime]` on the table `Candle` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Candle_marketId_interval_openTime_key" ON "Candle"("marketId", "interval", "openTime");
