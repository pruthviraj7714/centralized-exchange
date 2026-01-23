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

    const subscribeToOrderbook = useCallback(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: "SUBSCRIBE_ORDERBOOK"
            }));
        }
    }, [socket]);

    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}?pair=${pair}`);

        ws.onopen = () => {
            console.log('WebSocket connected for pair:', pair);
            setSocket(ws);
            setIsConnected(true);
            
            // Subscribe to orderbook updates
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
                            asks: data.asks || []
                        });
                        break;

                    case "ORDERBOOK_UPDATE":
                        console.log('Orderbook update received:', data);
                        setOrderbook({
                            bids: data.bids || [],
                            asks: data.asks || []
                        });
                        break;

                    case "TRADE_EXECUTED":
                        console.log('Trade executed:', data.trade);
                        setRecentTrades(prev => [data.trade, ...prev.slice(0, 19)]); // Keep last 20 trades
                        break;

                    case "ERROR":
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
        subscribeToOrderbook
    };
};

export default useOrderbook;