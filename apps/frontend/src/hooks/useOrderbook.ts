import { WS_URL } from "@/lib/config";
import Decimal from "decimal.js";
import { useEffect, useState, useCallback, useRef } from "react"

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

interface IUpdatedMarketData {
    lastPrice: string;
    change: string;
    changePercent: string;
    high: string;
    low: string;
    volume: string;
}

const useOrderbook = (pair: string, chartInterval: string) => {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
    const [recentTrades, setRecentTrades] = useState<TradeData[]>([]);
    const [candles, setCandles] = useState<any[]>([]);
    const [updatedMarketData, setUpdatedMarketData] = useState<IUpdatedMarketData | null>(null);
    const [error, setError] = useState<null | string>(null);
    const orderbookBuffer = useRef<OrderbookData | null>(null);
    const tradesBuffer = useRef<TradeData[]>([]);
    const marketBuffer = useRef<IUpdatedMarketData | null>(null);


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
        const interval = setInterval(() => {
            if (orderbookBuffer.current) {
                setOrderbook(orderbookBuffer.current);
            }

            if (tradesBuffer.current.length) {
                setRecentTrades(prev => [
                    ...tradesBuffer.current,
                    ...prev,
                ].slice(0, 20));
                tradesBuffer.current = [];
            }

            if (marketBuffer.current) {
                setUpdatedMarketData(marketBuffer.current);
            }
        }, 100); // 🔥 sweet spot

        return () => clearInterval(interval);
    }, []);


    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}?pair=${pair}`);

        ws.onopen = () => {
            console.log('WebSocket connected for pair:', pair);
            setSocket(ws);
            setIsConnected(true);

            ws.send(JSON.stringify({
                type: "SUBSCRIBE_ORDERBOOK"
            }));
            ws.send(JSON.stringify({
                type: "SUBSCRIBE_CANDLES",
                interval: chartInterval
            }))
        };



        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received WebSocket message:', data);

                switch (data.type) {
                    case "ORDERBOOK_SNAPSHOT":
                        console.log('Orderbook snapshot received:', data);
                        orderbookBuffer.current = {
                            bids: data.bids || [],
                            asks: data.asks || [],
                            pair: data.pair,
                            timestamp: data.timestamp,
                        };
                        break;

                    case "ORDERBOOK_UPDATE":
                        console.log('Orderbook update received:', data);
                        orderbookBuffer.current = applyOrderbookUpdate(orderbookBuffer.current, data);
                        break;

                    case "ORDERBOOK_UPDATE":
                        console.log('Orderbook update received:', data);
                        orderbookBuffer.current = applyOrderbookUpdate(orderbookBuffer.current, data)
                        break;

                    case "TRADE_EXECUTED":
                        console.log('Trade executed:', data.trade);
                        marketBuffer.current = {
                            lastPrice: data.trade.price,
                            change: marketBuffer.current?.lastPrice ? Decimal(marketBuffer.current?.lastPrice).minus(data.trade.price).toString() : "0",
                            changePercent: marketBuffer.current?.lastPrice ? Decimal(marketBuffer.current?.lastPrice).minus(data.trade.price).div(marketBuffer.current?.lastPrice).times(100).toString() : "0",
                            high: Decimal.max(marketBuffer.current?.high || "0", data.trade.price).toString(),
                            low: Decimal.min(marketBuffer.current?.low || "0", data.trade.price).toString(),
                            volume: marketBuffer.current?.volume ? Decimal(marketBuffer.current?.volume).plus(data.trade.quantity).toString() : "0"
                        }
                        tradesBuffer.current = [...tradesBuffer.current, data.trade];
                        break;

                    case "CANDLE_NEW":
                        setCandles(prev => [...prev, data.candle]);
                        break;

                    case "CANDLE_UPDATE":
                        setCandles((prev) => prev.map(candle => candle.open === data.candle.open ? {
                            ...candle,
                            ...data.candle
                        } : candle))
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
    }, [pair, chartInterval]);

    return {
        socket,
        isConnected,
        orderbook,
        recentTrades,
        candles,
        updatedMarketData,
        error
    };
};

export default useOrderbook;