import { WS_URL } from "@/lib/config";
import { useEffect, useState, useCallback } from "react"

interface OrderbookLevel {
    price: string;
    totalQuantity: string;
    orderCount: number;
    orders: Array<{ orderId: string; quantity: string }>;
}

interface OrderbookData {
    bids: OrderbookLevel[];
    asks: OrderbookLevel[];
    pair: string;
    timestamp: number;
}

interface TradeData {
    buyOrderId: string;
    sellOrderId: string;
    price: string;
    quantity: string;
    pair: string;
    timestamp: number;
}

const useOrderbook = (pair: string) => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
    const [recentTrades, setRecentTrades] = useState<TradeData[]>([]);
    const [error, setError] = useState<null | string>(null);

    const applyOrderbookUpdate = useCallback(
        (prev: OrderbookData | null, update: any): OrderbookData => {
            if (!prev) {
                return {
                    bids: update.bids || [],
                    asks: update.asks || [],
                    pair: update.pair,
                    timestamp: update.timestamp,
                };
            }

            return {
                ...prev,
                bids: update.bids || prev.bids,
                asks: update.asks || prev.asks,
                timestamp: update.timestamp,
            };
        },
        []
    );

    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}?pair=${pair}`);

        ws.onopen = () => {
            console.log('WebSocket connected for pair:', pair);
            setSocket(ws);
            setIsConnected(true);

            ws.send(JSON.stringify({
                type: "SUBSCRIBE_ORDERBOOK"
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received WebSocket message:', data);

                switch (data.type) {
                    case "ORDERBOOK_SNAPSHOT":
                        console.log('Orderbook snapshot received:', data);
                        setOrderbook({
                            bids: data.bids || [],
                            asks: data.asks || [],
                            pair: data.pair,
                            timestamp: data.timestamp,
                        });
                        break;

                    case "ORDERBOOK_UPDATE":
                        console.log('Orderbook update received:', data);
                        setOrderbook((prev) => applyOrderbookUpdate(prev, data))
                        break;

                    case "TRADE_EXECUTED":
                        console.log('Trade executed:', data.trade);
                        setRecentTrades(prev => [data.trade, ...prev.slice(0, 19)]); 
                        break;

                    case "ERROR":
                        setError(data.message);
                        console.error('WebSocket error:', data.message);
                        break;

                    default:
                        console.log('Unknown message type:', data.type);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setSocket(null);
            setIsConnected(false);
        };

        ws.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            setSocket(null);
            setIsConnected(false);
        };

        return () => {
            console.log('Cleaning up WebSocket connection');
            ws.close();
        };
    }, [pair]);

    return {
        socket,
        isConnected,
        orderbook,
        recentTrades,
        error
    };
};

export default useOrderbook;