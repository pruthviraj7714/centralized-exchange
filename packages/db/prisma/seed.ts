import { SEED_MARKETS } from "@repo/common";
import prisma from "..";

async function seedDb() {
  await prisma.market.deleteMany({})
  await prisma.market.createMany({
    data: SEED_MARKETS.map((m) => {
      return {
        ticker: m.ticker,
        baseAsset: m.baseAsset,
        quoteAsset: m.quoteAsset,
        sparkline7d: [],
        logo: m.logo,
        symbol: m.symbol,
        price: 0,
      };
    }),
  });
  console.log('markets successfully seeded into db');
  
}

seedDb();
