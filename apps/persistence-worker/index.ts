import redisClient from "@repo/redisclient";
import prisma from "@repo/db";
import {
  CONSUMER_NAME,
  DLQ_STREAM,
  GROUP_NAME,
  PERSISTENCE_STREAM,
} from "./config";
import type { OrderEvent } from "./types";

function parseStreamData(streams: any[]) {
  const results: any[] = [];
  for (const [, entries] of streams) {
    for (const [id, fields] of entries) {
      const obj: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        obj[fields[i]] = fields[i + 1];
      }
      if (obj.data) {
        results.push({ streamId: id, ...JSON.parse(obj.data) });
      }
    }
  }
  return results;
}

const createConsumerGroup = async () => {
  try {
    await redisClient.xgroup(
      "CREATE",
      PERSISTENCE_STREAM,
      GROUP_NAME,
      "0",
      "MKSTREAM"
    );
  } catch (error: any) {
    if (error.message.includes("BUSYGROUP")) {
      console.log(`group with name ${GROUP_NAME} already exists`);
    } else {
      console.error(error);
    }
  }
};

const handleEvent = async (
  eventFn: (order: OrderEvent) => void | any,
  order: OrderEvent
) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await eventFn(order);
      await redisClient.xack(PERSISTENCE_STREAM, GROUP_NAME, order.streamId);
      return;
    } catch (err) {
      console.error(`Failed to process order ${order.streamId}:`, err);
      if (attempt < 3) {
        console.log(`retrying attempt ${attempt + 1}...`);
        await new Promise((res) => setTimeout(res, 1000));
      } else {
        console.log("sending to dlq");
        await redisClient.xadd(DLQ_STREAM, "*", "data", JSON.stringify(order));
        await redisClient.xack(PERSISTENCE_STREAM, GROUP_NAME, order.streamId);
      }
    }
  }
};

const handleCancelOrder = async (order: OrderEvent): Promise<void> => {
  const odr = await prisma.order.findUnique({
    where: {
      id: order.orderId,
    },
  });

  if (!odr) {
    console.error("no order found");
    return;
  }

  if (odr.status === "CANCELLED") {
    console.error("order is already cancelled");
    return;
  }

  if (odr.status === "FILLED" || odr.status === "PARTIALLY_FILLED") {
    console.error(
      "order is already filled or partially filled, cannot cancel now"
    );
    return;
  }

  const [baseAsset, quoteAsset] = odr.pair;

  const lockedAmount =
    odr.side === "BUY" ? odr.quantity * odr.price : odr.quantity;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT * FROM "Order" WHERE id=${order.orderId} FOR UPDATE`;

      await tx.wallet.updateMany({
        where: {
          asset: odr.side === "BUY" ? quoteAsset : baseAsset,
          userId: order.userId,
        },
        data: {
          locked: {
            decrement: lockedAmount,
          },
          available: {
            increment: lockedAmount,
          },
        },
      });

      await tx.order.update({
        where: {
          id: order.orderId,
        },
        data: {
          status: "CANCELLED",
        },
      });
    });
    console.log("order successfully cancelled");
    await redisClient.xack(PERSISTENCE_STREAM, GROUP_NAME, order.streamId);
  } catch (error) {
    console.error(error);
  }
};

const handleOrderMatchOrCreate = async (data: any) => {
  try {
    const {
      data: { makers = [], taker, trades = [] },
      streamId,
    } = data;

    console.log(trades);
    

    const [baseAsset, quoteAsset] = taker.pair.split("-");

    await prisma.$transaction(async (tx) => {
      let order;
      if (taker.id) {
        order = await tx.order.update({
          where: { id: taker.id },
          data: {
            status: taker.status,
            filledQuantity: taker.filledQuantity,
          },
        });
      } else {
        order = await tx.order.create({
          data: {
            pair: taker.pair,
            quantity: taker.quantity,
            side: taker.side,
            status: taker.status,
            type: taker.type,
            userId: taker.userId,
            price: taker.price,
            filledQuantity: taker.filledQuantity,
          },
        });
      }

      const isOrderBuy = taker.side === "BUY";

      const market = await tx.market.findFirst({
        where: { baseAsset, quoteAsset },
      });
      if (!market) throw new Error("market not found!");

      const ensureWallet = async (userId: string, asset: string) => {
        await tx.wallet.upsert({
          where: { userId_asset: { userId, asset } },
          update: {},
          create: { userId, asset, available: 0, locked: 0 },
        });
      };

      const ensurePromises: Promise<any>[] = [
        ensureWallet(taker.userId, baseAsset),
        ensureWallet(taker.userId, quoteAsset),
      ];
      for (const m of makers) {
        ensurePromises.push(ensureWallet(m.userId, baseAsset));
        ensurePromises.push(ensureWallet(m.userId, quoteAsset));
      }
      await Promise.all(ensurePromises);

      let usedBidAmount = 0; 
      let usedAskAmount = 0; 

      for (const m of makers) {
        await tx.order.update({
          where: { id: m.id },
          data: {
            status: "FILLED",
            filledQuantity: m.filledQuantity,
          },
        });

        if (isOrderBuy) {
          await tx.wallet.update({
            where: { userId_asset: { userId: m.userId, asset: baseAsset } },
            data: {
              locked: { increment: -Number(m.filledQuantity) },
            },
          });
          await tx.wallet.update({
            where: { userId_asset: { userId: m.userId, asset: quoteAsset } },
            data: {
              available: { increment: Number(m.filledQuantity) * Number(m.price) },
            },
          });
        } else {
          await tx.wallet.update({
            where: { userId_asset: { userId: m.userId, asset: quoteAsset } },
            data: {
              locked: { increment: -(Number(m.filledQuantity) * Number(m.price)) },
            },
          });
          await tx.wallet.update({
            where: { userId_asset: { userId: m.userId, asset: baseAsset } },
            data: {
              available: { increment: Number(m.filledQuantity) },
            },
          });
        }
      }

      for (const trade of trades) {
        await tx.trade.create({
          data: {
            pair: trade.pair,
            price: trade.price,
            marketId: market.id, 
            quantity: trade.quantity,
            askId: order.side === "BUY" ? trade.askId : order.id,
            bidId: order.side === "BUY" ? trade.bidId : order.id,
            executedAt: new Date(trade.executedAt),
          },
        });

        if (isOrderBuy) {
          usedBidAmount += Number(trade.quantity) * Number(trade.price);
          usedAskAmount += Number(trade.quantity); 
        } else {
          usedAskAmount += Number(trade.quantity); 
          usedBidAmount += Number(trade.quantity) * Number(trade.price); 
        }
      }

      if (isOrderBuy) {
        await tx.wallet.update({
          where: { userId_asset: { userId: taker.userId, asset: quoteAsset } },
          data: {
            locked: { increment: -usedBidAmount },
          },
        });
        await tx.wallet.update({
          where: { userId_asset: { userId: taker.userId, asset: baseAsset } },
          data: {
            available: { increment: usedAskAmount },
          },
        });
      } else {
        await tx.wallet.update({
          where: { userId_asset: { userId: taker.userId, asset: baseAsset } },
          data: {
            locked: { increment: -usedAskAmount },
          },
        });
        await tx.wallet.update({
          where: { userId_asset: { userId: taker.userId, asset: quoteAsset } },
          data: {
            available: { increment: usedBidAmount },
          },
        });
      }

      if (taker.type === "MARKET") {
        if (isOrderBuy) {
          const takerQuote = await tx.wallet.findUnique({
            where: { userId_asset: { userId: taker.userId, asset: quoteAsset } },
            select: { locked: true },
          });
          const leftover = Number(takerQuote?.locked ?? 0);
          if (leftover > 0) {
            await tx.wallet.update({
              where: { userId_asset: { userId: taker.userId, asset: quoteAsset } },
              data: {
                locked: { increment: -leftover },
                available: { increment: leftover },
              },
            });
          }
        } else {
          const takerBase = await tx.wallet.findUnique({
            where: { userId_asset: { userId: taker.userId, asset: baseAsset } },
            select: { locked: true },
          });
          const leftover = Number(takerBase?.locked ?? 0);
          if (leftover > 0) {
            await tx.wallet.update({
              where: { userId_asset: { userId: taker.userId, asset: baseAsset } },
              data: {
                locked: { increment: -leftover },
                available: { increment: leftover },
              },
            });
          }
        }
      }
    });

    await redisClient.xack(PERSISTENCE_STREAM, GROUP_NAME, streamId);

    console.log("Order + Trades persisted successfully");
  } catch (error) {
    console.error("Error in handleOrderMatchOrCreate:", error);
    throw error;
  }
};

const handlers: Record<
  OrderEvent["event"],
  (order: OrderEvent) => Promise<any>
> = {
  "Order.CreateWithTrades": handleOrderMatchOrCreate,
  "Order.Cancel": handleCancelOrder,
};
const processOrders = async (orders: OrderEvent[]) => {
  await Promise.allSettled(
    orders.map(async (order) => {
      const handler = handlers[order.event];
      if (handler) {
        await handleEvent(handler, order);
      } else {
        console.warn(`No handler for event: ${order.event}`);
      }
    })
  );
};
async function main() {
  console.log("Persistence worker is running...");
  
  await createConsumerGroup();

  const prevMessages = await redisClient.xreadgroup(
    "GROUP",
    GROUP_NAME,
    CONSUMER_NAME,
    "STREAMS",
    PERSISTENCE_STREAM,
    "0"
  );

  if (prevMessages && prevMessages.length > 0) {
    await processOrders(parseStreamData(prevMessages));
  }

  while (true) {
    try {
      const newMessages = await redisClient.xreadgroup(
        "GROUP",
        GROUP_NAME,
        CONSUMER_NAME,
        "STREAMS",
        PERSISTENCE_STREAM,
        ">"
      );

      if (!newMessages) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      if (newMessages && newMessages.length > 0) {
        await processOrders(parseStreamData(newMessages));
      }
    } catch (error) {
      console.error(error);
    }
  }
}
main();
