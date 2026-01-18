import { Decimal } from "@prisma/client/runtime/client";
import prisma  from "..";

async function main() {
  console.log("🌱 Seeding CEX data...");
  const users = await prisma.user.createMany({
    data: [
      { email: "alice@cex.com" },
      { email: "bob@cex.com" },
      { email: "charlie@cex.com" },
      { email: "marketmaker@cex.com" }
    ]
  });

  const [alice, bob, charlie, mm] = await prisma.user.findMany();
  const btcMarket = await prisma.market.create({
    data: {
      symbol: "BTC_USDT",
      baseAsset: "BTC",
      quoteAsset: "USDT"
    }
  });

  const ethMarket = await prisma.market.create({
    data: {
      symbol: "ETH_USDT",
      baseAsset: "ETH",
      quoteAsset: "USDT"
    }
  });
  async function wallet(userId: string, asset: string, amount: string) {
    return prisma.wallet.create({
      data: {
        userId,
        asset,
        available: new Decimal(amount),
        locked: new Decimal(0)
      }
    });
  }

  await Promise.all([
    wallet(alice.id, "USDT", "50000"),
    wallet(alice.id, "BTC", "1.5"),

    wallet(bob.id, "USDT", "20000"),
    wallet(bob.id, "BTC", "0.4"),

    wallet(charlie.id, "USDT", "30000"),
    wallet(charlie.id, "BTC", "0.8"),

    wallet(mm.id, "USDT", "1000000"),
    wallet(mm.id, "BTC", "100"),
    wallet(mm.id, "ETH", "2000")
  ]);
  const buyPrices = ["64500", "64400", "64300"];
  const sellPrices = ["64600", "64700", "64800"];

  for (const price of buyPrices) {
    await prisma.order.create({
      data: {
        userId: mm.id,
        marketId: btcMarket.id,
        side: "BUY",
        type: "LIMIT",
        status: "OPEN",
        price: new Decimal(price),
        originalQuantity: new Decimal("0.5"),
        remainingQuantity: new Decimal("0.5")
      }
    });
  }

  for (const price of sellPrices) {
    await prisma.order.create({
      data: {
        userId: mm.id,
        marketId: btcMarket.id,
        side: "SELL",
        type: "LIMIT",
        status: "OPEN",
        price: new Decimal(price),
        originalQuantity: new Decimal("0.4"),
        remainingQuantity: new Decimal("0.4")
      }
    });
  }
  async function trade(
    marketId: string,
    buyOrderId: string,
    sellOrderId: string,
    price: string,
    qty: string,
    minutesAgo: number
  ) {
    return prisma.trade.create({
      data: {
        marketId,
        buyOrderId,
        sellOrderId,
        price: new Decimal(price),
        quantity: new Decimal(qty),
        makerFee: new Decimal("0.0005"),
        takerFee: new Decimal("0.001"),
        executedAt: new Date(Date.now() - minutesAgo * 60 * 1000)
      }
    });
  }
  const buyOrder = await prisma.order.create({
    data: {
      userId: alice.id,
      marketId: btcMarket.id,
      side: "BUY",
      type: "LIMIT",
      status: "FILLED",
      price: new Decimal("64550"),
      originalQuantity: new Decimal("0.1"),
      remainingQuantity: new Decimal("0")
    }
  });

  const sellOrder = await prisma.order.create({
    data: {
      userId: bob.id,
      marketId: btcMarket.id,
      side: "SELL",
      type: "LIMIT",
      status: "FILLED",
      price: new Decimal("64550"),
      originalQuantity: new Decimal("0.1"),
      remainingQuantity: new Decimal("0")
    }
  });

  await Promise.all([
    trade(btcMarket.id, buyOrder.id, sellOrder.id, "64500", "0.05", 30),
    trade(btcMarket.id, buyOrder.id, sellOrder.id, "64520", "0.03", 20),
    trade(btcMarket.id, buyOrder.id, sellOrder.id, "64550", "0.02", 10)
  ]);

  console.log("✅ CEX seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
