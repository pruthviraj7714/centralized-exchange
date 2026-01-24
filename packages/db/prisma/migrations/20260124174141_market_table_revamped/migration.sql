/*
  Warnings:

  - Added the required column `lotSize` to the `Market` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxOrderSize` to the `Market` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minOrderSize` to the `Market` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tickSize` to the `Market` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Market" ADD COLUMN     "change24h" DECIMAL(10,6),
ADD COLUMN     "high24h" DECIMAL(38,18),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lotSize" DECIMAL(38,18) NOT NULL,
ADD COLUMN     "low24h" DECIMAL(38,18),
ADD COLUMN     "marketCap" DECIMAL(38,18),
ADD COLUMN     "maxOrderSize" DECIMAL(38,18) NOT NULL,
ADD COLUMN     "minOrderSize" DECIMAL(38,18) NOT NULL,
ADD COLUMN     "open24h" DECIMAL(38,18),
ADD COLUMN     "price" DECIMAL(38,18),
ADD COLUMN     "priceChange" DECIMAL(38,18),
ADD COLUMN     "quoteVolume24h" DECIMAL(38,18),
ADD COLUMN     "sparkline7d" DECIMAL(65,30)[],
ADD COLUMN     "tickSize" DECIMAL(38,18) NOT NULL,
ADD COLUMN     "volume24h" DECIMAL(38,18);
