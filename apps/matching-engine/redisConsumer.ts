import redisClient from "@repo/redisclient";
import { CONSUMER_NAME, GROUP_NAME, MATCHING_ENGINE_STREAM } from "./config";
import type { IOrderResponse } from "./types";

const createConsumerGroup = async () => {
  try {
    await redisClient.xgroup(
      "CREATE",
      MATCHING_ENGINE_STREAM,
      GROUP_NAME,
      "0",
      "MKSTREAM"
    );
  } catch (error: any) {
    if (error.message.includes("BUSYGROUP")) {
      console.log(`Group with name ${GROUP_NAME} already exists`);
    } else {
      console.error(error);
    }
  }
};

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

function processOrders(orders: IOrderResponse[]) {
  orders.map(async (order) => {
    switch (order.event) {
      case "ORDER_CREATED": {
        //order creation logic here
        break;
      }
      case "ORDER_CANCELLED": {
        //order cancellation logic here
        break;
      }
    }
  });
}

async function main() {
  await createConsumerGroup();

  const prevMessages = await redisClient.xreadgroup(
    "GROUP",
    GROUP_NAME,
    CONSUMER_NAME,
    "STREAMS",
    MATCHING_ENGINE_STREAM,
    "0"
  );

  console.log(parseStreamData(prevMessages));

  if (prevMessages.length > 0) {
    processOrders(parseStreamData(prevMessages));
  }

  // if (prevMessages && prevMessages.length > 0) {
  //   await processOrders(parseStreamData(prevMessages));
  // }

  while (true) {
    try {
      const newMessages = await redisClient.xreadgroup(
        "GROUP",
        GROUP_NAME,
        CONSUMER_NAME,
        "STREAMS",
        MATCHING_ENGINE_STREAM,
        ">"
      );

      if (!newMessages) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      // if (newMessages && newMessages.length > 0) {
      //   await processOrders(parseStreamData(newMessages));
      // }
    } catch (error) {
      console.error(error);
    }
  }
} 

main();
