import { WS_URL } from "@/lib/config";
import { IUpdatedMarketData } from "@/types/market";
import { IOrderBookOrder, OrderbookData } from "@/types/orderbook";
import { TradeData } from "@/types/trade";
import Decimal from "decimal.js";
import { useEffect, useState, useCallback, useRef } from "react"

const useOrderbook = (pair: string, chartInterval: string) => {
    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
    const [recentTrades, setRecentTrades] = useState<TradeData[]>([]);
    const [candles, setCandles] = useState<any[]>([]);
    const [updatedMarketData, setUpdatedMarketData] = useState<IUpdatedMarketData | null>(null);
    const [error, setError] = useState<null | string>(null);
    const [bids, setBids] = useState<IOrderBookOrder[]>([]);
    const [asks, setAsks] = useState<IOrderBookOrder[]>([]);

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
            socketRef.current = ws;
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
                        setOrderbook(prev => applyOrderbookUpdate(prev, data));
                        break;

                    case "TRADE_EXECUTED":
                        console.log('Trade executed:', data.trade);
                        // setUpdatedMarketData(prev => {
                        //     const prevLast = prev?.lastPrice ?? data.trade.price;

                        //     return {
                        //         lastPrice: data.trade.price,
                        //         change: Decimal(prevLast).minus(data.trade.price).toString(),
                        //         changePercent: Decimal(prevLast)
                        //             .minus(data.trade.price)
                        //             .div(prevLast)
                        //             .times(100)
                        //             .toString(),
                        //         high: Decimal.max(prev?.high || "0", data.trade.price).toString(),
                        //         low: Decimal.min(prev?.low || data.trade.price, data.trade.price).toString(),
                        //         volume: prev?.volume
                        //             ? Decimal(prev.volume).plus(data.trade.quantity).toString()
                        //             : data.trade.quantity,
                        //     };
                        // });

                        setRecentTrades(prev => {
                            const updated = [...prev, data.trade];
                            return updated.slice(-20);
                        });
                        break;

                    case "CANDLE_NEW":
                        setCandles(prev => [...prev, data.candle]);
                        break;

                    case "CANDLE_UPDATE":
                        setCandles((prev) => prev.map(candle => candle.timestamp === data.candle.timestamp ? {
                            ...candle,
                            ...data.candle
                        } : candle))
                        break;
                    
                    case "MARKET_UPDATE":
                        console.log("market updated", data)
                        const { 
                            price,
                            low24h,
                            high24h,
                            volume24h,
                            change24h,
                            priceChange24h,
                         } = data.data;
                        setUpdatedMarketData({
                            high : high24h,
                            low : low24h,
                            lastPrice : price,
                            change : priceChange24h,
                            changePercent : change24h,
                            volume : volume24h,
                        })
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
            socketRef.current = null;
            setIsConnected(false);
        };

        ws.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            socketRef.current = null;
            setIsConnected(false);
        };

        return () => {
            console.log('Cleaning up WebSocket connection');
            ws.onmessage = null;
            ws.onerror = null;
            ws.onclose = null;
            ws.close();
        };
    }, [pair, chartInterval]);

    useEffect(() => {
        if (orderbook) {
            console.log("Updating orderbook display:", orderbook);

            let cumulativeBid = new Decimal(0);
            let cumulativeAsk = new Decimal(0);

            const transformedBids = orderbook.bids.map((level, index) => {
                const qty = new Decimal(level.totalQuantity);
                cumulativeBid = cumulativeBid.plus(qty);

                return {
                    price: new Decimal(level.price),
                    quantity: qty,
                    total: cumulativeBid,
                    requestId: `bid-${index}`,
                    orderCount: level.orderCount,
                };
            });

            const transformedAsks = orderbook.asks.map((level, index) => {
                const qty = new Decimal(level.totalQuantity);
                cumulativeAsk = cumulativeAsk.plus(qty);

                return {
                    price: new Decimal(level.price),
                    quantity: qty,
                    total: cumulativeAsk,
                    requestId: `ask-${index}`,
                    orderCount: level.orderCount,
                };
            });

            setBids(transformedBids);
            setAsks(transformedAsks);
        }
    }, [orderbook]);

    return {
        isConnected,
        orderbook,
        recentTrades,
        candles,
        updatedMarketData,
        error,
        bids,
        asks
    };
};

export default useOrderbook;