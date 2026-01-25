import cron from "node-cron";
import prisma from "@repo/db";
import { Decimal } from "decimal.js"

cron.schedule("* * * * *", async () => {
  try {
    const markets = await prisma.market.findMany({
      select: { id: true, symbol: true }
    });

    for (const market of markets) {
      try {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const trades24h = await prisma.trade.findMany({
          where: {
            marketId: market.id,
            executedAt: { gte: yesterday }
          },
          orderBy: { executedAt: 'asc' }
        });

        if (trades24h.length === 0) {
          console.log(`No trades for market ${market.symbol} in last 24h`);
          continue;
        }

        const latestTrade = await prisma.trade.findFirst({
          where: { marketId: market.id },
          orderBy: { executedAt: 'desc' }
        });

        const price = latestTrade?.price || new Decimal(0);
        const open24h = trades24h[0]?.price || new Decimal(0);
        
        const high24h = trades24h.reduce((max, trade) => 
          trade.price.gt(max) ? trade.price : max, 
          trades24h[0]?.price || new Decimal(0)
        );
        
        const low24h = trades24h.reduce((min, trade) => 
          trade.price.lt(min) ? trade.price : min, 
          trades24h[0]?.price || new Decimal(0)
        );

        const volume24h = trades24h.reduce((sum, trade) => 
          sum.add(trade.quantity || 0), 
          new Decimal(0)
        );

        const quoteVolume24h = trades24h.reduce((sum, trade) => 
          sum.add((trade.price || new Decimal(0)).mul(trade.quantity || 0)), 
          new Decimal(0)
        );

        const priceChange = price.sub(open24h);
        const change24h = open24h.gt(0) 
          ? priceChange.div(open24h).mul(100) 
          : new Decimal(0);

        const circulatingSupply = await getCirculatingSupply(market.id);
        const marketCap = price.mul(circulatingSupply || 0);

        await prisma.market.update({
          where: { id: market.id },
          data: {
            price,
            high24h,
            low24h,
            open24h,
            volume24h,
            quoteVolume24h,
            change24h,
            priceChange,
            marketCap,
          },
        });

        console.log(`Updated market: ${market.symbol}`);
      } catch (error) {
        console.error(`Error updating market ${market.symbol}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in cron job:", error);
  }
});

async function getCirculatingSupply(marketId: string): Promise<Decimal> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { marketCap: true }
  });
  
  return market?.marketCap || new Decimal(0);
}