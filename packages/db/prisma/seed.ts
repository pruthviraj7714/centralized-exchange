import { SUPPORTED_MARKETS } from "@repo/common";
import prisma from "..";

async function seedDb() {
  await prisma.market.createMany({
    data: SUPPORTED_MARKETS.map((m) => {
      const [base, quote] = m.split("-");
      return {
        ticker: m,
        baseAsset: base!,
        quoteAsset: quote!,
        price: 0,
        volume24h: 0,
        marketCap: 0,
        change24h: 0,
        sparkline7d: [],
      };
    }),
  });
}

seedDb();
