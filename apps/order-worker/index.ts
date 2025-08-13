import redisClient from "@repo/redisclient";
import prisma from "@repo/db";

const ORDER_STREAM = process.env.ORDER_STREAM!;
const GROUP_NAME = process.env.GROUP_NAME!;
const CONSUMER_NAME = process.env.CONSUMER_NAME!;
const ORDER_DLQ_STREAM = process.env.ORDER_DLQ_STREAM!;
const MATCHING_ENGINE_STREAM = process.env.MATCHING_ENGINE_STREAM!;

interface IOrder {
  id: string;
  requestId: string;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  userId: string;
  quantity: string;
  price: string;
  pair: string;
  createdAt: string;
}

interface IOrderResponse {
  id: string;
  userId: string;
  side: "BUY" | "SELL";
  pair: string;
  price: number;
  quantity: number;
  filledQuantity: number;
  createdAt: Date;
  updatedAt: Date;
  type: "LIMIT" | "MARKET";
  status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED";
}

function parseStreamData(streams: any[]) {
  const results: any[] = [];
  for (const [, entries] of streams) {
    for (const [id, fields] of entries) {
      const obj: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        obj[fields[i]] = fields[i + 1];
      }
      results.push({ id, ...obj });
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

const lockFundsInDbAndCreateOrder = async (
  order: IOrder
): Promise<void | IOrderResponse> => {
  const wallets = await prisma.wallet.findMany({
    where: { userId: order.userId },
  });

  const side = order.side;
  const [baseAsset, quoteAsset] = order.pair.split("-");

  const baseWallet = wallets.find((w) => w.asset === baseAsset);
  const quoteWallet = wallets.find((w) => w.asset === quoteAsset);

  if (!quoteWallet) {
    console.log("no quote asset wallet found");
    return;
  }

  if (!baseWallet) {
    console.log("no base asset wallet found");
    return;
  }

  if (side === "BUY" && order.type === "LIMIT") {
    if (parseFloat(order.price) === 0 || parseFloat(order.quantity) === 0) {
      console.log("qty & price should be greater than 0");
      return;
    }

    const amount = parseFloat(order.price) * parseFloat(order.quantity);

    if (quoteWallet.available < amount) {
      console.log("insuffcient funds!");
      return;
    }

    const response = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
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

      const orderData = await tx.order.create({
        data: {
          userId: order.userId,
          pair: order.pair,
          quantity: parseFloat(order.quantity),
          price: parseFloat(order.price),
          side: order.side,
          type: order.type,
          status: "OPEN",
        },
      });

      return orderData;
    });

    return response;
  }

  if (side === "BUY" && order.type === "MARKET") {
    if (parseFloat(order.quantity) === 0) {
      console.log("amount should be greater than 0");
      return;
    }

    const bestPrice = await redisClient.get(`Best-Ask:${order.pair}`);

    if (!bestPrice) {
      console.log("no best price found");
      return;
    }

    const amount =
      (bestPrice ? parseFloat(bestPrice) : 0) * parseInt(order.quantity);

    if (quoteWallet.available < amount) {
      console.log("insufficient funds");
      return;
    }

    const response = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
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

      const orderData = await tx.order.create({
        data: {
          userId: order.userId,
          pair: order.pair,
          quantity: parseFloat(order.quantity),
          price: order.price ? parseFloat(order.price) : 0,
          side: order.side,
          type: order.type,
          status: "OPEN",
        },
      });

      return orderData;
    });

    return response;
  }

  if (side === "SELL" && order.type === "LIMIT") {
    const quantityToLock = parseFloat(order.quantity);

    if (baseWallet.available < quantityToLock) {
      console.log("insufficient balance");
      return;
    }

    const response = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
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

      const orderData = await tx.order.create({
        data: {
          userId: order.userId,
          pair: order.pair,
          quantity: parseFloat(order.quantity),
          price: parseFloat(order.price),
          side: order.side,
          type: order.type,
          status: "OPEN",
        },
      });

      return orderData;
    });

    return response;
  }

  if (side === "SELL" && order.type === "MARKET") {
    const qty = parseFloat(order.quantity);

    if (qty === 0) {
      console.log("quantity should be more than 0");
      return;
    }

    if (qty > baseWallet.available) {
      console.log("you don't have enought qty");
      return;
    }

    const response = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
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

      const orderData = await tx.order.create({
        data: {
          userId: order.userId,
          pair: order.pair,
          quantity: parseFloat(order.quantity),
          price: order.price ? parseFloat(order.price) : 0,
          side: order.side,
          type: order.type,
          status: "OPEN",
        },
      });

      return orderData;
    });

    return response;
  }
};

const processOrders = async (orders: IOrder[]) => {
  await Promise.allSettled(
    orders.map(async (order) => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const orderData = await lockFundsInDbAndCreateOrder(order);
          if (!orderData) {
            console.log("no order data found");
            await redisClient.xack(ORDER_STREAM, GROUP_NAME, order.id);
            await redisClient.del(`retry-count:${order.requestId}`);
            return;
          }
          console.log("order successfully created in db");
          await redisClient.xadd(
            MATCHING_ENGINE_STREAM,
            "*",
            ...Object.entries(orderData).flatMap(([k, v]) => [k, String(v)])
          );
          console.log("order successfully pushed to matching engine queue");
          await redisClient.xack(ORDER_STREAM, GROUP_NAME, order.id);
          await redisClient.del(`retry-count:${order.requestId}`);
          return;
        } catch (err) {
          console.error(`Failed to process order ${order.id}:`, err);
          if (attempt < 3) {
            console.log(`retrying attempt ${attempt + 1}...`);
            await new Promise((res) => setTimeout(res, 1000));
          } else {
            console.log("sending to dlq");
            const orderData = {
              ...order,
              type: "CREATE_ORDER",
            };
            await redisClient.xadd(
              ORDER_DLQ_STREAM,
              "*",
              ...Object.entries(orderData).flatMap(([k, v]) => [k, String(v)])
            );
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
