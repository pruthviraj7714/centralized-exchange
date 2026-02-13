import { Decimal } from "@prisma/client/runtime/client";
import prisma from "..";
import { SEED_MARKETS } from "@repo/common";

const smallNumber = () => {
  return Math.floor(Math.random() * 100);
}

const largeNumber = () => {
  return Math.floor(Math.random() * 10000);
}

async function main() {
  console.log("🌱 Seeding Market data...");

  await prisma.trade.deleteMany();
  await prisma.order.deleteMany();
  await prisma.walletLedger.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
  await prisma.market.deleteMany();

  await prisma.market.createMany({
    data: SEED_MARKETS.map((market) => ({
      symbol: market.ticker,
      baseAsset: market.baseAsset,
      quoteAsset: market.quoteAsset,
      logo: market.logo,
      price: new Decimal(largeNumber()),
      high24h: new Decimal(largeNumber()),
      low24h: new Decimal(largeNumber()),
      open24h: new Decimal(largeNumber()),
      volume24h: new Decimal(largeNumber()),
      change24h: new Decimal(smallNumber()),
      priceChange: new Decimal(smallNumber()),
      marketCap: new Decimal(largeNumber()),
      minOrderSize: new Decimal(smallNumber()),
      maxOrderSize: new Decimal(largeNumber()),
      tickSize: new Decimal(smallNumber()),
      lotSize: new Decimal(smallNumber()),
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
