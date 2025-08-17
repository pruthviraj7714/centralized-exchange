import redisClient from "@repo/redisclient";
import prisma from "@repo/db";
import { CONSUMER_NAME, DLQ_STREAM, GROUP_NAME, ORDER_CANCEL_STREAM } from "./config";
import type { ICancelOrder, ICancelOrderResponse } from "./types";


function parseStreamData(streams: any[]) {
  const results: any[] = [];
  for (const [, entries] of streams) {
    for (const [id, fields] of entries) {
      const obj: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        obj[fields[i]] = fields[i + 1];
      }
      results.push({ streamId : id, ...obj });
    }
  }
  return results;
}

const createConsumerGroup = async () => {
  try {
    await redisClient.xgroup(
      "CREATE",
      ORDER_CANCEL_STREAM,
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

const cancelOrder = async (
  order: ICancelOrder
): Promise<void | ICancelOrderResponse> => {
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

  if (odr.status === "FILLED" || odr.status === "PARTIAL") {
    console.error(
      "order is already filled or partially filled, cannot cancel now"
    );
    return;
  }

  const response = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT * FROM "Order" WHERE id=${order.orderId} FOR UPDATE`;

    const odr = await tx.order.update({
      where: {
        id: order.orderId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    return odr;
  });

  return response;
};

const processOrders = async (orders: ICancelOrder[]) => {
  await Promise.allSettled(
    orders.map(async (order) => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          let orderData = await cancelOrder(order);
          if (!orderData) {
            console.log("no order data found");
            await redisClient.xack(ORDER_CANCEL_STREAM, GROUP_NAME, order.streamId);
            await redisClient.del(`retry-count:${order.requestId}`);
            return;
          }
          console.log("order successfully cancelled");

          //TODO:sending it to client via publisher
        
          await redisClient.xack(ORDER_CANCEL_STREAM, GROUP_NAME, order.id);
          await redisClient.del(`retry-count:${order.requestId}`);
          return;
        } catch (err) {
          console.error(`Failed to process order ${order.id}:`, err);
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
    ORDER_CANCEL_STREAM,
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
        ORDER_CANCEL_STREAM,
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
