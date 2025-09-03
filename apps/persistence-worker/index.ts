import redisClient from "@repo/redisclient";
import prisma from "@repo/db";
import {
  CONSUMER_NAME,
  DLQ_STREAM,
  GROUP_NAME,
  PERSISTENCE_STREAM,
} from "./config";
import type { IOrderResponse, ITrade, OrderEvent } from "./types";

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
      //TODO:sending it to client via publisher
      return;
    } catch (err) {
      console.error(`Failed to process order ${order.streamId}:`, err);
      if (attempt < 3) {
        console.log(`retrying attempt ${attempt + 1}...`);
        await new Promise((res) => setTimeout(res, 1000));
      } else {
        console.log("sending to dlq");
        await redisClient.xadd(
          DLQ_STREAM,
          "*",
          ...Object.entries(order).flatMap(([k, v]) => [k, String(v)])
        );
      }
    } finally {
      await redisClient.xack(PERSISTENCE_STREAM, GROUP_NAME, order.streamId);
      await redisClient.del(`retry-count:${order.requestId}`);
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

//TODO:unlocking funds for market buy orders + for other orders unlocking locked funds from user wallets

const handleOrderMatchOrCreate = async (data: any) => {
  try {
    const { data : {makers, taker, trades }, streamId } = data;

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
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

      const market = await tx.market.findFirst({
        where : {
          baseAsset : taker.pair.split("-")[0],
          quoteAsset : taker.pair.split("-")[1],
        }
      })

      if(!market) throw new Error("market not found!");

      await Promise.all(
        makers.map((m: IOrderResponse) => {
          tx.order.update({
            where: {
              id: m.id,
            },
            data: {
              status: "FILLED",
              filledQuantity: m.filledQuantity,
            },
          });
        })
      );

      await Promise.all(
        trades.map((trade: ITrade) => {
          tx.trade.create({
            data: {
              pair: trade.pair,
              price: trade.price,
              marketId : market.id,
              quantity: trade.quantity,
              askId: order.side === "BUY" ? trade.askId : order.id,
              bidId: order.side === "BUY" ? trade.bidId : order.id,
              executedAt: new Date(trade.executedAt),
            },
          });
        })
      );
    });

    await redisClient.xack(PERSISTENCE_STREAM, GROUP_NAME, streamId);

    console.log("Order + Trades persisted successfully");
  } catch (error) {
    console.error(error);
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
