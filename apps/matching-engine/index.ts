// import { WebSocketServer } from "ws";
// import type { IOrderbookData, IOrderResponse } from "./types";
// import WebSocket from "ws";
// import { SUPPORTED_PAIRS } from "./constants";
// import Orderbook from "./orderbook";
// import {
//   broadcastMessageToClient,
//   broadcastMessageToClients,
//   createConsumerGroup,
//   handleCancelOrder,
//   handleMatchOrder,
//   parseStreamData,
//   sendErrorToClient,
//   sendOrderbookSnapshot,
// } from "./matchingEngineService";
// import redisClient from "@repo/redisclient";
// import {
//   CONSUMER_NAME,
//   GROUP_NAME,
//   JWT_SECRET,
//   MATCHING_ENGINE_STREAM,
// } from "./config";
// import jwt, { type JwtPayload } from "jsonwebtoken";
// import fs from "fs";

// const orderbookMap: Map<string, IOrderbookData> = new Map();

// const removeClientFromOrderbook = (ws: WebSocket, ticker: string): void => {
//   try {
//     const orderbookData = orderbookMap.get(ticker);
//     if (orderbookData) {
//       const initialCount = orderbookData.clients.length;
//       orderbookData.clients = orderbookData.clients.filter(
//         (client) => client !== ws
//       );
//       const finalCount = orderbookData.clients.length;

//       if (initialCount !== finalCount) {
//         console.log(`Removed client from ${ticker} (${finalCount} remaining)`);
//       }
//     }
//   } catch (error) {
//     console.error("Error removing client from orderbook:", error);
//   }
// };

// const validateTicker = (
//   ticker: string
// ): { isValid: boolean; error?: string } => {
//   if (!ticker) {
//     return { isValid: false, error: "Ticker is required" };
//   }

//   const [baseAsset, quoteAsset] = ticker.split("-");

//   if (!baseAsset || !quoteAsset) {
//     return {
//       isValid: false,
//       error: "Invalid ticker format. Expected format: BASE-QUOTE",
//     };
//   }

//   if (!SUPPORTED_PAIRS.includes(ticker)) {
//     return { isValid: false, error: `Unsupported trading pair: ${ticker}` };
//   }

//   return { isValid: true };
// };

// const validateUser = (token: string) => {
//   try {
//     const user = jwt.verify(token, JWT_SECRET) as JwtPayload;
//     return user.sub;
//   } catch (error) {
//     return null;
//   }
// };

// const getOrCreateOrderbookData = (ticker: string): IOrderbookData => {
//   if (orderbookMap.has(ticker)) {
//     return orderbookMap.get(ticker)!;
//   }

//   const [baseAsset, quoteAsset] = ticker.split("-");
//   const orderbook = new Orderbook(baseAsset!, quoteAsset!);

//   const orderbookData: IOrderbookData = {
//     orderbook,
//     clients: [],
//   };

//   orderbookMap.set(ticker, orderbookData);
//   console.log(`Created new orderbook for ${ticker}`);

//   return orderbookData;
// };

// async function processOrders(orders: IOrderResponse[]) {
//   for (const order of orders) {
//     const orderbookData = getOrCreateOrderbookData(order.pair);

//     try {
//       switch (order.event) {
//         case "CREATE_ORDER": {
//           const isDone = await handleMatchOrder(orderbookData, order);
//           if (isDone) {
//             broadcastMessageToClients(orderbookData, {
//               type: "ORDERBOOK_UPDATE",
//               pair: order.pair,
//               bids: orderbookData.orderbook.getBids(),
//               asks: orderbookData.orderbook.getAsks(),
//               lastPrice: orderbookData.orderbook.lastPrice,
//               timestamp: Date.now(),
//             });
//             await redisClient.xack(
//               MATCHING_ENGINE_STREAM,
//               GROUP_NAME,
//               order.streamId
//             );
//           }
//           break;
//         }
//         case "CANCEL_ORDER": {
//           await handleCancelOrder(orderbookData, order);
//           broadcastMessageToClients(orderbookData, {
//             type: "ORDERBOOK_UPDATE",
//             pair: order.pair,
//             bids: orderbookData.orderbook.getBids(),
//             asks: orderbookData.orderbook.getAsks(),
//             timestamp: Date.now(),
//           });
//           await redisClient.xack(
//             MATCHING_ENGINE_STREAM,
//             GROUP_NAME,
//             order.streamId
//           );
//           break;
//         }
//       }
//     } catch (err) {
//       console.error("Error processing order:", order, err);
//     }
//   }
// }

// const wss = new WebSocketServer({ port: 8080 });

// wss.on("connection", async (ws, req) => {
//   let ticker: string | null;
//   let token: string | null;

//   const params = new URLSearchParams(req.url?.split("?")[1]);
//   ticker = params.get("ticker");
//   token = params.get("token");

//   if (!token) {
//     sendErrorToClient(ws, "No Token Found!");
//     ws.close(1008, "No token found");
//     return;
//   }

//   if (!ticker) {
//     sendErrorToClient(ws, "No ticker provided in URL");
//     ws.close(1008, "No ticker provided");
//     return;
//   }
//   try {
//     const userId = validateUser(token);

//     if (!userId) {
//       sendErrorToClient(ws, "Unauthorized User");
//       ws.close(1008, "UnAuthorized User");
//       return;
//     } else {
//       (ws as any).userId = userId;
//     }

//     const validation = validateTicker(ticker);
//     if (!validation.isValid) {
//       sendErrorToClient(ws, validation.error!);
//       ws.close(1008, validation.error);
//       return;
//     }

//     const orderbookData = getOrCreateOrderbookData(ticker);

//     orderbookData.clients.push(ws);

//     await sendOrderbookSnapshot(ws, orderbookData);

//     ws.on("message", async (data) => {
//       try {
//         const payload = JSON.parse(data.toString());
//         switch (payload.type) {
//           case "PING":
//             broadcastMessageToClient(ws, {
//               type: "PONG",
//               timestamp: Date.now(),
//             });
//             break;

//           case "GET_ORDERBOOK":
//             await sendOrderbookSnapshot(ws, orderbookData);
//             break;

//           default:
//             console.warn("Unknown message type from client:", payload.type);
//             sendErrorToClient(ws, `Unknown message type: ${payload.type}`);
//         }
//       } catch (error) {
//         console.error("Error parsing client message:", error);
//         sendErrorToClient(ws, "Invalid message format");
//       }
//     });

//     ws.on("error", (error) => {
//       console.error(`WebSocket error for ${ticker}:`, error);
//       removeClientFromOrderbook(ws, ticker);
//     });

//     ws.on("close", (code, reason) => {
//       console.log(
//         `Client disconnected from ${ticker} (code: ${code}, reason: ${reason?.toString()})`
//       );
//       removeClientFromOrderbook(ws, ticker);
//     });

//     ws.on("pong", () => {});

//     const pingInterval = setInterval(() => {
//       if (ws.readyState === WebSocket.OPEN) {
//         ws.ping();
//       } else {
//         clearInterval(pingInterval);
//       }
//     }, 30000);
//   } catch (error) {
//     console.error("Error handling client connection:", error);
//     if (ticker) {
//       removeClientFromOrderbook(ws, ticker);
//     }
//     ws.close(1011, "Internal server error");
//   }
// });

// wss.on("listening", () => {
//   console.log("WebSocket server is running on ws://localhost:8080");
// });

// wss.on("error", (error) => {
//   console.error("WebSocket server error:", error);
// });

// const consumerStream = async () => {
//   // let latestSnapshot = {};

//   // fs.readFile("./snaphost.json", (err, data) => {
//   //   if (err) console.log(err.message);
//   //   else {
//   //     latestSnapshot = data || {};
//   //   }
//   // });

//   // if(Object.keys(latestSnapshot).length !== 0) {
    
//   // }

//   await createConsumerGroup();

//   const prevMessages = await redisClient.xreadgroup(
//     "GROUP",
//     GROUP_NAME,
//     CONSUMER_NAME,
//     "STREAMS",
//     MATCHING_ENGINE_STREAM,
//     "0"
//   );

//   if (prevMessages && prevMessages.length > 0) {
//     const orders = parseStreamData(prevMessages);
//     await processOrders(orders);
//   }

//   while (true) {
//     try {
//       const newMessages = await redisClient.xreadgroup(
//         "GROUP",
//         GROUP_NAME,
//         CONSUMER_NAME,
//         "BLOCK",
//         5000,
//         "STREAMS",
//         MATCHING_ENGINE_STREAM,
//         ">"
//       );

//       if (newMessages && newMessages.length > 0) {
//         const orders = parseStreamData(newMessages);
//         await processOrders(orders);
//       }
//     } catch (error) {
//       console.error(error);
//     }
//   }
// };

// consumerStream();
