import redisClient from "@repo/redisclient";
import prisma from "@repo/db";
import { CONSUMER_NAME, DLQ_STREAM, GROUP_NAME, MATCHING_ENGINE_STREAM, ORDER_STREAM } from "./config";

//use pubsubs to send errors to client
type OrderEvent =
  | {
      event: "CREATE_ORDER";
      requestId: string;
      side: "BUY" | "SELL";
      type: "LIMIT" | "MARKET";
      userId: string;
      streamId?: string;
      quantity: string;
      price: string;
      orderId?: never;
      pair: string;
      timestamp: number;
    }
  | {
      event: "CANCEL_ORDER";
      requestId: string;
      userId: string;
      orderId: string;
      timestamp: number;
      streamId?: string;
      side?: never;
      pair?: never;
    };

function parseStreamData(streams: any[]) {
  const results: any[] = [];
  for (const [, entries] of streams) {
    for (const [id, fields] of entries) {
      const obj: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        obj[fields[i]] = fields[i + 1];
      }
      results.push({ streamId: id, ...obj });
    }
  }
  return results;
}

const createConsumerGroup = async () => {
  try {
    await redisClient.xgroup(
      "CREATE",
      ORDER_STREAM,
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

const lockFundsInDb = async (order: OrderEvent): Promise<boolean> => {
  const wallets = await prisma.wallet.findMany({
    where: { userId: order.userId },
  });

  const side = order.side;
  const [baseAsset, quoteAsset] = order?.pair?.split("-")!;

  if (!baseAsset || !quoteAsset) {
    console.log("invalid ticker");
    return false;
  }

  const baseWallet = wallets.find((w) => w.asset === baseAsset);
  const quoteWallet = wallets.find((w) => w.asset === quoteAsset);

  if (!quoteWallet) {
    console.log("no quote asset wallet found");
    return false;
  }

  if (!baseWallet) {
    console.log("no base asset wallet found");
    return false;
  }

  if (side === "BUY" && order.type === "LIMIT") {
    if (parseFloat(order.price) === 0 || parseFloat(order.quantity) === 0) {
      console.log("qty & price should be greater than 0");
      return false;
    }

    const amount = parseFloat(order.price) * parseFloat(order.quantity);

    if (quoteWallet.available < amount) {
      console.log("insuffcient funds!");
      return false;
    }

    try {
      await prisma.wallet.update({
        where: {
          id: quoteWallet?.id,
        },
        data: {
          available: {
            decrement: amount,
          },
          locked: {
            increment: amount,
          },
        },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  if (side === "BUY" && order.type === "MARKET") {
    if (parseFloat(order.quantity) === 0) {
      console.log("amount should be greater than 0");
      return false;
    }

    const bestPrice = await redisClient.get(`Best-Ask:${order.pair}`);

    if (!bestPrice) {
      console.log("no best price found");
      return false;
    }

    const amount =
      (bestPrice ? parseFloat(bestPrice) : 0) * parseInt(order.quantity);

    if (quoteWallet.available < amount) {
      console.log("insufficient funds");
      return false;
    }

    try {
      await prisma.wallet.update({
        where: {
          id: quoteWallet?.id,
        },
        data: {
          available: {
            decrement: amount,
          },
          locked: {
            increment: amount,
          },
        },
      });
    } catch (error) {
      return false;
    }

    return true;
  }

  if (side === "SELL" && order.type === "LIMIT") {
    const quantityToLock = parseFloat(order.quantity);

    if (baseWallet.available < quantityToLock) {
      console.log("insufficient balance");
      return false;
    }
    try {
      await prisma.wallet.update({
        where: {
          id: baseWallet?.id,
        },
        data: {
          available: {
            decrement: quantityToLock,
          },
          locked: {
            increment: quantityToLock,
          },
        },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  if (side === "SELL" && order.type === "MARKET") {
    const qty = parseFloat(order.quantity);

    if (qty === 0) {
      console.log("quantity should be more than 0");
      return false;
    }

    if (qty > baseWallet.available) {
      console.log("you don't have enought qty");
      return false;
    }
    try {
      await prisma.wallet.update({
        where: {
          id: baseWallet?.id,
        },
        data: {
          available: {
            decrement: qty,
          },
          locked: {
            increment: qty,
          },
        },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  return false;
};

const validateCancelOrder = async (order: OrderEvent): Promise<boolean> => {
  const odr = await prisma.order.findUnique({
    where: {
      id: order.orderId,
    },
  });

  if (!odr) {
    console.error("no order found");
    return false;
  }

  if (odr.status === "CANCELLED") {
    console.error("order is already cancelled");
    return false;
  }

  if (odr.status === "FILLED" || odr.status === "PARTIAL") {
    console.error(
      "order is already filled or partially filled, cannot cancel now"
    );
    return false;
  }

  return true;
};

const processOrders = async (orders: OrderEvent[]) => {
  await Promise.allSettled(
    orders.map(async (order) => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        switch (order.event) {
          case "CREATE_ORDER": {
            try {
              let isLocked = await lockFundsInDb(order);

              if (!isLocked) {
                console.log("failed to lock funds");
                await redisClient.xack(
                  ORDER_STREAM,
                  GROUP_NAME,
                  order.streamId!
                );
                await redisClient.del(`retry-count:${order.requestId}`);
                return;
              }
              console.log("successfully locked funds in db");
              await redisClient.xadd(
                MATCHING_ENGINE_STREAM,
                "*",
                ...Object.entries(order).flatMap(([k, v]) => [k, String(v)])
              );
              console.log("order successfully pushed to matching engine queue");
              await redisClient.xack(ORDER_STREAM, GROUP_NAME, order.streamId!);
              await redisClient.del(`retry-count:${order.requestId}`);
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
                  ...Object.entries(order).flatMap(([k, v]) => [
                    k,
                    String(v),
                  ])
                );
              }
            }
            break;
          }
          case "CANCEL_ORDER": {
            try {
              let isValid = await validateCancelOrder(order);

              if (!isValid) {
                console.log("cancel request rejected!");
                await redisClient.xack(
                  ORDER_STREAM,
                  GROUP_NAME,
                  order.streamId!
                );
                await redisClient.del(`retry-count:${order.requestId}`);
                return;
              }

              console.log("successfully validated cancel order request");
              await redisClient.xadd(
                MATCHING_ENGINE_STREAM,
                "*",
                ...Object.entries(order).flatMap(([k, v]) => [k, String(v)])
              );
              console.log(
                "order cancel request pushed to matching engine queue"
              );
              await redisClient.xack(ORDER_STREAM, GROUP_NAME, order.streamId!);
              await redisClient.del(`retry-count:${order.requestId}`);
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
                  ...Object.entries(order).flatMap(([k, v]) => [
                    k,
                    String(v),
                  ])
                );
              }
            }
            break;
          }
        }
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
    ORDER_STREAM,
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
        ORDER_STREAM,
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
