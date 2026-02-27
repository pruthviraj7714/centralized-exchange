import { WS_URL } from "@/lib/config";
import { IUpdatedMarketData } from "@/types/market";
import { IOrderBookOrder, OrderbookData } from "@/types/orderbook";
import { TradeData } from "@/types/trade";
import Decimal from "decimal.js";
import { useEffect, useState, useCallback, useRef } from "react";

const useOrderbook = (pair: string, chartInterval: string) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [recentTrades, setRecentTrades] = useState<TradeData[]>([]);
  const [candles, setCandles] = useState<any[]>([]);
  const [updatedMarketData, setUpdatedMarketData] =
    useState<IUpdatedMarketData | null>(null);
  const [error, setError] = useState<null | string>(null);
  const [bids, setBids] = useState<IOrderBookOrder[]>([]);
  const [asks, setAsks] = useState<IOrderBookOrder[]>([]);

  const lastSequenceRef = useRef<number>(0);
  const wsRef = useRef<WebSocket | null>(null);

  const applyToDisplay = useCallback((data: OrderbookData) => {
    let cumulativeBid = new Decimal(0);
    let cumulativeAsk = new Decimal(0);

    const transformedBids = data.bids.map((level, index) => {
      const qty = new Decimal(level.totalQuantity);
      cumulativeBid = cumulativeBid.plus(qty);
      return {
        price: new Decimal(level.price),
        quantity: qty,
        total: cumulativeBid,
        requestId: `bid-${level.price}`,
        orderCount: level.orderCount,
      };
    });

    const transformedAsks = data.asks.map((level, index) => {
      const qty = new Decimal(level.totalQuantity);
      cumulativeAsk = cumulativeAsk.plus(qty);
      return {
        price: new Decimal(level.price),
        quantity: qty,
        total: cumulativeAsk,
        requestId: `ask-${level.price}`,
        orderCount: level.orderCount,
      };
    });

    setBids(transformedBids);
    setAsks(transformedAsks);
  }, []);

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}?pair=${pair}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected for pair:", pair);
        setIsConnected(true);
        setError(null);
        lastSequenceRef.current = 0;

        ws.send(
          JSON.stringify({
            type: "SUBSCRIBE_ORDERBOOK",
          }),
        );
        ws.send(
          JSON.stringify({
            type: "SUBSCRIBE_CANDLES",
            interval: chartInterval,
          }),
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "ORDERBOOK_SNAPSHOT":
              const snapshotSequence = data.sequence;
              if (snapshotSequence <= lastSequenceRef.current) {
                console.log("skipping out-of-order update");
                return;
              }
              lastSequenceRef.current = data.sequence;
              const snapshotData: OrderbookData = {
                bids: data.bids || [],
                asks: data.asks || [],
                pair: data.pair,
                timestamp: data.timestamp,
              };
              applyToDisplay(snapshotData);
              break;

            case "ORDERBOOK_UPDATE":
              const currentSequence = data.sequence;
              if (currentSequence <= lastSequenceRef.current) {
                console.log("Skipping out-of-order update");
                return;
              }
              lastSequenceRef.current = currentSequence;
              const updated: OrderbookData = {
                bids: data.bids || [],
                asks: data.asks || [],
                pair: data.pair,
                timestamp: data.timestamp,
              };
              applyToDisplay(updated);
              break;

            case "TRADE_EXECUTED":
              setRecentTrades((prev) => {
                const updated = [data.trade, ...prev];
                return updated.slice(-20);
              });
              break;

            case "CANDLE_NEW":
              setCandles((prev) => [...prev, data.candle]);
              break;

            case "CANDLE_UPDATE":
              setCandles((prev) =>
                prev.map((candle) =>
                  candle.timestamp === data.candle.timestamp
                    ? {
                        ...candle,
                        ...data.candle,
                      }
                    : candle,
                ),
              );
              break;

            case "MARKET_UPDATE":
              const {
                price,
                low24h,
                high24h,
                volume24h,
                change24h,
                priceChange24h,
              } = data.data;
              setUpdatedMarketData({
                high: high24h,
                low: low24h,
                lastPrice: price,
                change: priceChange24h,
                changePercent: change24h,
                volume: volume24h,
              });
              break;

            case "ERROR":
              setError(data.message);
              console.error("WebSocket error:", data.message);
              break;
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        if (event.code !== 1000) {
          reconnectTimeout = setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      wsRef.current?.close(1000, "pair changed");
    };
  }, [pair, chartInterval]);

  return {
    isConnected,
    recentTrades,
    candles,
    updatedMarketData,
    error,
    bids,
    asks,
  };
};

export default useOrderbook;
