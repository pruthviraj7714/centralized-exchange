import { WebSocketServer } from "ws";
import { SUPPORTED_PAIRS } from "./constants";
import WebSocket from "ws";
import type { IOrderbookData, IOrderResponse, OrderEvent } from "./types";
import Orderbook from "./orderbook";
import redisClient from "@repo/redisclient";
import { PERSISTENCE_STREAM } from "./config";

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

const broadcastMessageToClient = (ws: WebSocket, message: any) => {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  } catch (error) {
    console.error("Error sending message to client:", error);
  }
};

export const orderbookMap: Map<string, IOrderbookData> = new Map();

let wsServer: WebSocketServer | null = null;

export const startWsServer = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      wsServer = new WebSocketServer({ port: 8080 });

      wsServer.on("connection", handleClientConnection);

      wsServer.on("listening", () => {
        console.log("WebSocket server is running on ws://localhost:8080");
        resolve();
      });

      wsServer.on("error", (error) => {
        console.error("WebSocket server error:", error);
        reject(error);
      });
    } catch (error) {
      console.error("Failed to start WebSocket server:", error);
      reject(error);
    }
  });
};

const handleClientConnection = async (ws: WebSocket, req: any) => {
  let ticker: string | undefined;

  try {
    ticker = extractTickerFromUrl(req.url);

    if (!ticker) {
      sendErrorToClient(ws, "No ticker provided in URL");
      ws.close(1008, "No ticker provided");
      return;
    }

    const validation = validateTicker(ticker);
    if (!validation.isValid) {
      sendErrorToClient(ws, validation.error!);
      ws.close(1008, validation.error);
      return;
    }

    const orderbookData = getOrCreateOrderbookData(ticker);

    orderbookData.clients.push(ws);

    console.log(
      `Client connected for ticker: ${ticker} (${orderbookData.clients.length} total clients)`
    );

    await sendOrderbookSnapshot(ws, orderbookData);

    setupClientEventHandlers(ws, orderbookData, ticker);
  } catch (error) {
    console.error("Error handling client connection:", error);
    if (ticker) {
      removeClientFromOrderbook(ws, ticker);
    }
    ws.close(1011, "Internal server error");
  }
};

const extractTickerFromUrl = (url?: string): string | undefined => {
  if (!url) return undefined;

  const match = url.match(/[?&]ticker=([^&]+)/);
  return match ? decodeURIComponent(match[1]!) : undefined;
};

const validateTicker = (
  ticker: string
): { isValid: boolean; error?: string } => {
  if (!ticker) {
    return { isValid: false, error: "Ticker is required" };
  }

  const [baseAsset, quoteAsset] = ticker.split("-");

  if (!baseAsset || !quoteAsset) {
    return {
      isValid: false,
      error: "Invalid ticker format. Expected format: BASE-QUOTE",
    };
  }

  if (!SUPPORTED_PAIRS.includes(ticker)) {
    return { isValid: false, error: `Unsupported trading pair: ${ticker}` };
  }

  return { isValid: true };
};

const getOrCreateOrderbookData = (ticker: string): IOrderbookData => {
  if (orderbookMap.has(ticker)) {
    return orderbookMap.get(ticker)!;
  }

  const [baseAsset, quoteAsset] = ticker.split("-");
  const orderbook = new Orderbook(baseAsset!, quoteAsset!);

  const orderbookData: IOrderbookData = {
    orderbook,
    clients: [],
  };

  orderbookMap.set(ticker, orderbookData);
  console.log(`📚 Created new orderbook for ${ticker}`);

  return orderbookData;
};

const sendOrderbookSnapshot = async (
  ws: WebSocket,
  orderbookData: IOrderbookData
): Promise<void> => {
  try {
    const snapshot = {
      type: "ORDERBOOK_SNAPSHOT",
      data: {
        bids: orderbookData.orderbook.getBids(),
        asks: orderbookData.orderbook.getAsks(),
        timestamp: Date.now(),
      },
    };

    broadcastMessageToClient(ws, snapshot);
  } catch (error) {
    console.error("Error sending orderbook snapshot:", error);
  }
};

const setupClientEventHandlers = (
  ws: WebSocket,
  orderbookData: IOrderbookData,
  ticker: string
) => {
  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleClientMessage(ws, message, orderbookData);
    } catch (error) {
      console.error("Error parsing client message:", error);
      sendErrorToClient(ws, "Invalid message format");
    }
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error for ${ticker}:`, error);
    removeClientFromOrderbook(ws, ticker);
  });

  ws.on("close", (code, reason) => {
    console.log(
      `Client disconnected from ${ticker} (code: ${code}, reason: ${reason?.toString()})`
    );
    removeClientFromOrderbook(ws, ticker);
  });

  ws.on("pong", () => {});

  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
};

const handleClientMessage = async (
  ws: WebSocket,
  message: any,
  orderbookData: IOrderbookData
): Promise<void> => {
  try {
    switch (message.type) {
      case "PING":
        broadcastMessageToClient(ws, { type: "PONG", timestamp: Date.now() });
        break;

      case "GET_ORDERBOOK":
        await sendOrderbookSnapshot(ws, orderbookData);
        break;

      default:
        console.warn("Unknown message type from client:", message.type);
        sendErrorToClient(ws, `Unknown message type: ${message.type}`);
    }
  } catch (error) {
    console.error("Error handling client message:", error);
    sendErrorToClient(ws, "Error processing message");
  }
};

const removeClientFromOrderbook = (ws: WebSocket, ticker: string): void => {
  try {
    const orderbookData = orderbookMap.get(ticker);
    if (orderbookData) {
      const initialCount = orderbookData.clients.length;
      orderbookData.clients = orderbookData.clients.filter(
        (client) => client !== ws
      );
      const finalCount = orderbookData.clients.length;

      if (initialCount !== finalCount) {
        console.log(
          `Removed client from ${ticker} (${finalCount} remaining)`
        );
      }
    }
  } catch (error) {
    console.error("Error removing client from orderbook:", error);
  }
};

const sendErrorToClient = (ws: WebSocket, errorMessage: string): void => {
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
