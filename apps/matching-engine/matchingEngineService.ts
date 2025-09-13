import redisClient from "@repo/redisclient";
import {
  GROUP_NAME,
  MATCHING_ENGINE_STREAM,
  PERSISTENCE_STREAM,
} from "./config";
import type { IOrderbookData, IOrderResponse } from "./types";
import WebSocket from "ws";


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

export const handleCancelOrder = async (
  orderbookData: IOrderbookData,
  orderData: IOrderResponse
): Promise<boolean> => {
  try {
    if (!orderData.orderId) {
      console.error("Missing orderId for CANCEL_ORDER");
      return false;
    }

    const isCancelled = orderbookData.orderbook.cancelOrder(orderData.orderId);

    if (isCancelled) {
      const data = {
        ...orderData,
        status: "CANCELLED",
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
      return true;
    } else {
      console.warn("Order not found or already cancelled:", orderData.orderId);
      return false;
    }
  } catch (error) {
    console.error("Error handling CANCEL_ORDER:", error);
    return false;
  }
};

export const handleMatchOrder = async (
  orderbookData: IOrderbookData,
  orderData: IOrderResponse
): Promise<boolean> => {
  try {
    const result = orderbookData.orderbook.addOrder(orderData);

    if (!result) {
      console.error("Failed to add order - no result returned");
      return false;
    }

    const { trades, makers, taker } = result;

    if (!taker && (!trades || trades.length === 0)) {
      console.error("Order placement failed - no order or trades created");
      return false;
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

    return true;
  } catch (error) {
    console.error("Error while mathing order :", error);
    return false;
  }
};

export const sendErrorToClient = (ws: WebSocket, errorMessage: string): void => {
  try {
    const errorResponse = {
      type: "ERROR",
      message: errorMessage,
      timestamp: Date.now(),
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(errorResponse));
    }
  } catch (error) {
    console.error("Error sending error message to client:", error);
  }
};

export const broadcastMessageToClients = (
  orderbookData: IOrderbookData,
  message: any
) => {
  if (!orderbookData?.clients?.length) {
    return;
  }

  orderbookData.clients.forEach((client) => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error("Error broadcasting to client:", error);
    }
  });
};

export const broadcastMessageToClient = (ws: WebSocket, message: any) => {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  } catch (error) {
    console.error("Error sending message to client:", error);
  }
};

export const sendOrderbookSnapshot = async (
  ws: WebSocket,
  orderbookData: IOrderbookData
): Promise<void> => {
  try {
    const snapshot = {
      type: "ORDERBOOK_SNAPSHOT",
      bids: orderbookData.orderbook.getBids(),
      asks: orderbookData.orderbook.getAsks(),
      lastPrice: orderbookData.orderbook.lastPrice,
      timestamp: Date.now(),
    };

    broadcastMessageToClient(ws, snapshot);
  } catch (error) {
    console.error("Error sending orderbook snapshot:", error);
  }
};
