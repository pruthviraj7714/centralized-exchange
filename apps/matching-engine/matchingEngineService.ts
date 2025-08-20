import redisClient from "@repo/redisclient";
import {
  GROUP_NAME,
  MATCHING_ENGINE_STREAM,
  PERSISTENCE_STREAM,
} from "./config";
import type { IOrderbookData, IOrderResponse } from "./types";

export const handleCancelOrder = async (
  orderbookData: IOrderbookData,
  orderData: IOrderResponse
): Promise<void> => {
  try {
    if (!orderData.orderId) {
      console.error("Missing orderId for CANCEL_ORDER");
      return;
    }

    const isCancelled = orderbookData.orderbook.cancelOrder(orderData.orderId);

    if (isCancelled) {
      const data = {
        ...orderData,
        status : "CANCELLED",
        event: "Order.Cancel",
      };
  
      await redisClient.xadd(
        PERSISTENCE_STREAM,
        "*",
        "data",
        JSON.stringify(data)
      );
  
      await redisClient.xack(
        MATCHING_ENGINE_STREAM,
        GROUP_NAME,
        orderData.streamId
      );
      console.log("Order cancelled successfully:", orderData.orderId);
    } else {
      console.warn("Order not found or already cancelled:", orderData.orderId);
    }
  } catch (error) {
    console.error("Error handling CANCEL_ORDER:", error);
    throw error;
  } finally {
    await redisClient.xack(
      MATCHING_ENGINE_STREAM,
      GROUP_NAME,
      orderData.streamId
    );
  }
};

// export const persistTrades = async (trades: any[]): Promise<void> => {
//   try {
//     const persistPromises = trades.map(async (trade) => {
//       const tradeData = {
//         ...trade,
//         event: "Trade.Create",
//       };

//       return redisClient.xadd(
//         PERSISTENCE_STREAM,
//         "*",
//         "data",
//         JSON.stringify(tradeData)
//       );
//     });

//     await Promise.all(persistPromises);
//     console.log(`Persisted ${trades.length} trades`);
//   } catch (error) {
//     console.error("Error persisting trades:", error);
//     throw error;
//   }
// };

// export const persistOrder = async (
//   order: IOrderResponse,
//   eventType: string,
//   orderStatus: ORDER_STATUS
// ): Promise<void> => {
//   try {

//     console.log(`Persisted order with event: ${eventType}`);
//   } catch (error) {
//     console.error(`Error persisting order (${eventType}):`, error);
//     throw error;
//   }
// };

export const handleMatchOrder = async (
  orderbookData: IOrderbookData,
  orderData: IOrderResponse
): Promise<void> => {
  try {
    const result = orderbookData.orderbook.addOrder(orderData);

    if (!result) {
      console.error("Failed to add order - no result returned");
      return;
    }

    const { trades, makers, taker } = result;

    if (!taker && (!trades || trades.length === 0)) {
      console.error("Order placement failed - no order or trades created");
      return;
    }

    const data = {
      event: "Order.CreateWithTrades",
      data: {
        makers,
        taker,
        trades,
      },
    };

    await redisClient.xadd(
      PERSISTENCE_STREAM,
      "*",
      "data",
      JSON.stringify(data)
    );

    await redisClient.xack(
      MATCHING_ENGINE_STREAM,
      GROUP_NAME,
      orderData.streamId
    );
  } catch (error) {
    console.error("Error while mathing order :", error);
    throw error;
  }
};

export const createConsumerGroup = async () => {
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

export function parseStreamData(streams: any[]) {
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
