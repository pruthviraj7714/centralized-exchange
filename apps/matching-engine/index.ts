import { WebSocketServer } from "ws";
import { SUPPORTED_PAIRS } from "./constants";
import WebSocket from "ws";
import type { IOrderbookData } from "./types";
import Orderbook from "./orderbook";

const wss = new WebSocketServer({ port: 8080 });

export const broadcastMessageToClients = (
  orderbookData: IOrderbookData,
  message: any
) => {
  orderbookData.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

const orderbookMap: Map<string, IOrderbookData> = new Map();


wss.on("connection", async (ws, req) => {
  const ticker = req.url?.split("?ticker=")[1];

  if (!ticker) {
    ws.send(
      JSON.stringify({
        type: "ERROR",
        message: "No Ticker Found!",
      })
    );
    return;
  }

  const [baseAsset, quoteAsset] = ticker.split("-");

  if (!baseAsset || !quoteAsset || !SUPPORTED_PAIRS.includes(ticker)) {
    ws.send(
      JSON.stringify({
        type: "ERROR",
        message: "Invalid Ticker",
      })
    );
    return;
  }

  let orderbookData: IOrderbookData;

  if (!orderbookMap.has(ticker)) {
    const orderbook = new Orderbook(baseAsset, quoteAsset);
    orderbookData = {
      orderbook,
      clients: [],
    };
    orderbookMap.set(ticker, orderbookData);
  } else {
    orderbookData = orderbookMap.get(ticker) as IOrderbookData;
  }

  orderbookData.clients.push(ws);

  console.log("client connected");

  ws.on("error", (err) => {
    console.error(err.message);
    ws.send(
      JSON.stringify({
        type: "ERROR",
        message: err.message,
      })
    );
  });

  ws.on("close", () => {
    orderbookData.clients = orderbookData.clients.filter((c) => c !== ws);
    console.log("client disconnected");
  });
});

wss.on("listening", () => {
    console.log('Matching engine server is running on ws://localhost:8080');
})
