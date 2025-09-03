import cron from "node-cron";
import prisma from "@repo/db";

cron.schedule("* * * * *", async () => {
  const markets = await prisma.market.findMany();

  for (const market of markets) {
    const trades24h = await prisma.trade.aggregate({
      _sum: { quantity: true },
      where: {
        marketId: market.id,
        executedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    const last24hPrice = await prisma.trade.findFirst({
      where: {
        marketId: market.id,
        executedAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: {
        executedAt: "desc",
      },
    });

    const currPrice = market.price;

    const change24h = last24hPrice
      ? ((currPrice - last24hPrice.price) / last24hPrice.price) * 100
      : currPrice;

    const sparkline7d: any = await prisma.$queryRaw`
        SELECT date_trunc('hour', "executedAt") as bucket,
           AVG(price) as avg_price
    FROM "Trade"
    WHERE "marketId" = ${market.id}
      AND "executedAt" >= NOW() - interval '7 days'
    GROUP BY bucket
    ORDER BY bucket ASC;
  `;

    await prisma.market.update({
      where: {
        id: market.id,
      },
      data: {
        change24h,
        volume24h: trades24h._sum.quantity ?? 0,
        sparkline7d: sparkline7d.map((row: any) => row.avg_price),
      },
    });
  }
});
