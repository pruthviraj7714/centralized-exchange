import type WebSocket from "ws";
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8082 });

const subscriptions = new Map<string, Set<WebSocket>>();

wss.on("connection", (ws, req) => {
    ws.on("message", (data) => {
        const message = JSON.parse(data.toString());

        // if (message.type === "SUBSCRIBE_ORDERBOOK") {
        //     const { pair } = message;

        //     if (!subscriptions.has(pair)) {
        //         subscriptions.set(pair, new Set());
        //     }
        //     subscriptions.get(pair)!.add(ws);

        //     ws.send(JSON.stringify({
        //         type: "ORDERBOOK_SNAPSHOT",
        //         pair,
        //         bids : orderbook.bids || [],
        //         asks : orderbook.asks || []
        //     }))
        // }

        console.log("Received message:", data);
    });

    ws.on("close", () => {
        subscriptions.forEach((set) => set.delete(ws))
        console.log("websocket connection closed");
    });

    console.log("websocket connection established");
});
