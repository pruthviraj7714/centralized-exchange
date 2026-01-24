import { Decimal } from "@prisma/client/runtime/client";
import prisma from "..";
import { SEED_MARKETS } from "@repo/common";

async function main() {
  console.log("🌱 Seeding Market data...");

  await prisma.market.deleteMany();

  await prisma.market.createMany({
    data: SEED_MARKETS.map((market) => ({
      symbol: market.ticker,
      baseAsset: market.baseAsset,
      quoteAsset: market.quoteAsset,
      logo: market.logo,
      price: new Decimal(0),
      high24h: new Decimal(0),
      low24h: new Decimal(0),
      open24h: new Decimal(0),
      volume24h: new Decimal(0),
      quoteVolume24h: new Decimal(0),
      change24h: new Decimal(0),
      priceChange: new Decimal(0),
      marketCap: new Decimal(0),
      minOrderSize: new Decimal(0),
      maxOrderSize: new Decimal(0),
      tickSize: new Decimal(0),
      lotSize: new Decimal(0),
      sparkline7d: [],
      isActive: true,
      isFeatured: false,
    }
    ))
  })

  console.log("✅ Market seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
