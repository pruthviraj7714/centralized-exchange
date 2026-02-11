-- CreateTable
CREATE TABLE "Candle" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "closeTime" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(38,18) NOT NULL,
    "high" DECIMAL(38,18) NOT NULL,
    "low" DECIMAL(38,18) NOT NULL,
    "close" DECIMAL(38,18) NOT NULL,
    "volume" DECIMAL(38,18) NOT NULL,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Candle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Candle_marketId_interval_openTime_idx" ON "Candle"("marketId", "interval", "openTime");

-- AddForeignKey
ALTER TABLE "Candle" ADD CONSTRAINT "Candle_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
