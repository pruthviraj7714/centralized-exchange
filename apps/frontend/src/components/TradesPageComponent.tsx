"use client";

import useSocket from "@/hooks/useOrderbook";
import { useEffect, useMemo, useRef, useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { Button } from "./ui/button";
import { useSession } from "next-auth/react";
import {
  CandlestickSeries,
  type ChartOptions,
  createChart,
  type DeepPartial,
  type UTCTimestamp,
} from "lightweight-charts";
import { Card } from "./ui/card";
import { fetchMarketMetadata } from "@repo/common"
import Decimal from "decimal.js";
import useOrderbook from "@/hooks/useOrderbook";

type ORDER_STATUS = "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
interface IOrderResponse {
  id?: string;
  requestId: string;
  userId: string;
  side: "BUY" | "SELL";
  pair: string;
  price: number;
  quantity: number;
  filledQuantity: number;
  createdAt: number;
  orderId?: string;
  updatedAt: number;
  streamId: string;
  event?: "CREATE_ORDER" | "CANCEL_ORDER";
  type: "LIMIT" | "MARKET";
  status: ORDER_STATUS;
}
const INTERVALS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;
type Interval = (typeof INTERVALS)[number];

type Candle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  trades?: number;
};

const transformOrderbook = (
  orders: IOrderResponse[]
): {
  price: number;
  size: number;
  total: number;
  requestId: string;
}[] => {
  let orderbook: {
    price: number;
    size: number;
    total: number;
    requestId: string;
  }[] = [];
  let currTotal = 0;
  let lastOrderIndex = 0;
  for (let i = 0; i < orders.length; i++) {
    if (
      orderbook.length > 0 &&
      orders[lastOrderIndex].price === orders[i].price
    ) {
      orderbook[lastOrderIndex].size += orders[i].quantity;
      orderbook[lastOrderIndex].total += orders[i].quantity;
    } else {
      orderbook.push({
        price: orders[i].price,
        requestId: orders[i].requestId,
        size: orders[i].quantity,
        total: orders[i].quantity + currTotal,
      });
    }
    lastOrderIndex = orderbook.length - 1;
    currTotal += orders[i].quantity;
  }

  return orderbook;
};

const getIntervalSec = (interval: string) => {
  switch (interval) {
    case "1m": {
      return 60;
    }
    case "5m": {
      return 5 * 60;
    }
    case "15m": {
      return 15 * 60;
    }
    case "30m": {
      return 30 * 60;
    }
    case "1h": {
      return 60 * 60;
    }
    case "4h": {
      return 4 * 60 * 60;
    }
    case "1d": {
      return 24 * 60 * 60;
    }
    default: {
      return 0;
    }
  }
};

export default function TradesPageComponent({ ticker }: { ticker: string }) {
  const { isConnected, socket, orderbook, recentTrades } = useOrderbook(ticker);
  const [interval, setInterval] = useState<Interval>("1m");
  const [currentTab, setCurrentTab] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [bids, setBids] = useState<any[]>([]);
  const [asks, setAsks] = useState<any[]>([]);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const lastCandleRef = useRef<Candle | null>(null);
  const candlestickSeriesRef = useRef<any | null>(null);
  const [quantity, setQuantity] = useState<Decimal>(new Decimal(0));
  const [price, setPrice] = useState<Decimal>(new Decimal(0));
  const { data } = useSession();

  // Update bids and asks when orderbook changes
  useEffect(() => {
    if (orderbook) {
      console.log('Updating orderbook display:', orderbook);
      
      // Transform bids data for display
      const transformedBids = orderbook.bids.map((level, index) => ({
        price: parseFloat(level.price),
        quantity: parseFloat(level.totalQuantity),
        total: (index + 1) * parseFloat(level.totalQuantity), // Cumulative total
        requestId: `bid-${index}`,
        orderCount: level.orderCount
      }));
      
      // Transform asks data for display
      const transformedAsks = orderbook.asks.map((level, index) => ({
        price: parseFloat(level.price),
        quantity: parseFloat(level.totalQuantity),
        total: (index + 1) * parseFloat(level.totalQuantity), // Cumulative total
        requestId: `ask-${index}`,
        orderCount: level.orderCount
      }));
      
      setBids(transformedBids);
      setAsks(transformedAsks);
      
      // Update last price from recent trades
      if (recentTrades.length > 0) {
        setLastPrice(parseFloat(recentTrades[0].price));
      }
    }
  }, [orderbook, recentTrades]);

  // Update price when user clicks on orderbook
  const handlePriceClick = (priceValue: number) => {
    setPrice(new Decimal(priceValue));
  };

  // const fetchChartData = async () => {
  //   if (!data || !data.accessToken) return;
  //   try {
  //     const response = await axios.get(
  //       `${BACKEND_URL}/klines?symbol=${ticker.toUpperCase()}&interval=${interval}`,
  //       {
  //         headers: {
  //           Authorization: `Bearer ${data.accessToken}`,
  //         },
  //       }
  //     );

  //     return response.data
  //       .filter(
  //         (candle: any) =>
  //           candle.open != null &&
  //           candle.high != null &&
  //           candle.low != null &&
  //           candle.close != null
  //       )
  //       .map((candle: any) => ({
  //         time: Math.floor(new Date(candle.bucket).getTime() / 1000),
  //         open: Number(candle.open),
  //         high: Number(candle.high),
  //         low: Number(candle.low),
  //         close: Number(candle.close),
  //       }));
  //   } catch (error: any) {
  //     toast.error(error.message || "Failed to fetch chart data");
  //     return [];
  //   }
  // };

  // const processTick = (price: number, timestamp: number) => {
  //   const time = Math.floor(timestamp / 1000);
  //   const interverSec = getIntervalSec(interval);

  //   const candleTime = Math.floor(time / interverSec) * interverSec;

  //   const lastCandle = lastCandleRef.current;
  //   if (!lastCandle || !candlestickSeriesRef.current) return;

  //   if (candleTime === lastCandle.time) {
  //     lastCandle.high = Math.max(lastCandle.high, price);
  //     lastCandle.low = Math.min(lastCandle.low, price);
  //     lastCandle.close = price;

  //     candlestickSeriesRef.current.update(lastCandle);
  //   } else {
  //     const newCandle: Candle = {
  //       time: candleTime as UTCTimestamp,
  //       open: price,
  //       high: price,
  //       low: price,
  //       close: price,
  //     };
  //     lastCandleRef.current = newCandle;
  //     candlestickSeriesRef.current.update(newCandle);
  //   }
  // };

  const handlePlaceOrder = async (side: "BUY" | "SELL") => {
    if (!data || !data.accessToken) return;
    try {
      const response = await axios.post(
        `${BACKEND_URL}/orders`,
        {
          side,
          quantity,
          price,
          type: orderType,
          pair: ticker,
        },
        {
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
          },
        }
      );
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response.data.message ?? error.message);
    }
  };

  // useEffect(() => {
  //   if (!chartRef.current) return;

  //   const chartOptions: DeepPartial<ChartOptions> = {
  //     layout: {
  //       textColor: "#e5e7eb",
  //       background: { color: "#0b0b0b" },
  //     },
  //     grid: {
  //       vertLines: { color: "rgba(255,255,255,0.06)" },
  //       horzLines: { color: "rgba(255,255,255,0.06)" },
  //     },
  //   };
  //   const chart = createChart(chartRef.current, chartOptions);

  //   chart.applyOptions({
  //     width: chartRef.current.clientWidth,
  //     height: 500,
  //   });

  //   const candlestickSeries = chart.addSeries(CandlestickSeries, {
  //     upColor: "#26a69a",
  //     downColor: "#ef5350",
  //     borderVisible: false,
  //     wickUpColor: "#26a69a",
  //     wickDownColor: "#ef5350",
  //     borderColor: "#404040",
  //   });

  //   candlestickSeriesRef.current = candlestickSeries;

  //   const loadData = async () => {
  //     const data = await fetchChartData();
  //     if (data.length > 0) {
  //       candlestickSeries.setData(data);
  //       lastCandleRef.current = data[data.length - 1];
  //       chart.timeScale().fitContent();
  //     }
  //   };

  //   loadData();

  //   const ro = new ResizeObserver((entries) => {
  //     const cr = entries[0]?.contentRect;
  //     if (cr?.width) {
  //       chart.applyOptions({
  //         width: Math.floor(cr.width),
  //         height: 500,
  //       });
  //     }
  //   });
  //   ro.observe(chartRef.current);

  //   return () => {
  //     ro.disconnect();
  //     chart.remove();
  //     candlestickSeriesRef.current = null;
  //   };
  // }, [ticker, interval, data]);

  // Remove duplicate WebSocket logic since it's handled in useOrderbook hook

  // Remove old transform function since we handle transformation in useEffect
  const marketData = fetchMarketMetadata(ticker);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="mx-auto px-3 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex gap-1.5 pl-5">
              <img
  src={marketData?.logo}
  alt="logo"
  className="h-6 w-6 object-contain border border-slate-700"
/>
                <p>
                  {marketData?.baseAsset}-{marketData?.quoteAsset}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-emerald-400">O</span>
                  <span className="text-white">207.35</span>
                  <span className="text-emerald-400">H</span>
                  <span className="text-white">208.44</span>
                  <span className="text-emerald-400">L</span>
                  <span className="text-white">206.72</span>
                  <span className="text-emerald-400">C</span>
                  <span className="text-white">208.40</span>
                  <span className="text-emerald-400">1.05 (+0.51%)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="flex items-center space-x-6 text-sm">
                <span className="text-white font-medium">Chart</span>
              </nav>
              <div className="flex items-center space-x-4">
                <span className="text-slate-400">Book</span>
                <span className="text-slate-400">Trades</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
          <div className="col-span-6">
            <Card className="h-full bg-slate-900/30 border-slate-800">
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {INTERVALS.map((iv) => {
                      const isActive = iv === interval;
                      return (
                        <Button
                          key={iv}
                          size="sm"
                          variant="ghost"
                          className={
                            isActive
                              ? "bg-slate-700 text-white hover:bg-slate-600"
                              : "text-slate-400 hover:text-white hover:bg-slate-800"
                          }
                          onClick={() => setInterval(iv)}
                        >
                          {iv}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-400">
                    <span>07:18:51 (UTC)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 flex-1">
                <div
                  ref={chartRef}
                  className="w-full h-[400px] bg-slate-950 rounded border border-slate-800 flex items-center justify-center"
                ></div>
              </div>
            </Card>
          </div>

          <div className="col-span-3">
            <Card className="h-full bg-slate-900/30 border-slate-800">
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-white">Order Book</h2>
              </div>

              <div className="p-4 space-y-4 overflow-auto">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Price (USD)</span>
                    <span>Size (SOL)</span>
                    <span>Total (SOL)</span>
                  </div>
                  <div className="space-y-1">
                    {asks
                      .slice(0, 8)
                      .reverse()
                      .map((ask, index) => (
                        <div
                          key={`ask-${index}`}
                          className="flex items-center justify-between text-sm hover:bg-red-900/10 px-2 py-1 rounded cursor-pointer"
                          onClick={() => handlePriceClick(ask.price)}
                        >
                          <span className="text-red-400 font-mono">
                            {ask.price.toFixed(2)}
                          </span>
                          <span className="text-slate-300 font-mono">
                            {ask.quantity.toFixed(4)}
                          </span>
                          <span className="text-slate-300 font-mono">
                            {ask.total.toFixed(4)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="text-center py-2 border-y border-slate-800">
                  <div className="text-lg font-bold text-emerald-400">
                    {lastPrice || '---'}
                  </div>
                  <div className="text-xs text-slate-400">
                    Spread: {asks[0]?.price && bids[0]?.price ? (asks[0].price - bids[0].price).toFixed(2) : '---'}
                  </div>
                  <div className="text-xs text-slate-400">
                    Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                  </div>
                </div>

                <div>
                  <div className="space-y-1">
                    {bids
                      .slice(0, 8)
                      .map((bid, index) => (
                        <div
                          key={`bid-${index}`}
                          className="flex items-center justify-between text-sm hover:bg-emerald-900/10 px-2 py-1 rounded cursor-pointer"
                          onClick={() => handlePriceClick(bid.price)}
                        >
                          <span className="text-emerald-400 font-mono">
                            {bid.price.toFixed(2)}
                          </span>
                          <span className="text-slate-300 font-mono">
                            {bid.quantity.toFixed(4)}
                          </span>
                          <span className="text-slate-300 font-mono">
                            {bid.total.toFixed(4)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="col-span-3">
            <Card className="h-full bg-slate-900/30 border-slate-800">
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant={orderType === "LIMIT" ? "default" : "ghost"}
                    className={
                      orderType === "LIMIT"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "text-slate-400"
                    }
                    onClick={() => setOrderType("LIMIT")}
                  >
                    Limit
                  </Button>
                  <Button
                    size="sm"
                    variant={orderType === "MARKET" ? "default" : "ghost"}
                    className={
                      orderType === "MARKET"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "text-slate-400"
                    }
                    onClick={() => setOrderType("MARKET")}
                  >
                    Market
                  </Button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {orderType === "LIMIT" && (
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">
                      Price (USD)
                    </Label>
                    <Input
                      type="number"
                      onChange={(e) => setPrice(new Decimal(e.target.value))}
                      placeholder={
                        currentTab === "BUY"
                          ? "Enter bid price"
                          : "Enter ask price"
                      }
                      className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Quantity</Label>
                  <Input
                    type="number"
                    onChange={(e) => setQuantity(new Decimal(e.target.value))}
                    placeholder="Enter quantity"
                    className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                  <div className="text-xs text-orange-400">
                    ⚠ Minimum 0.01 SOL
                  </div>
                </div>

                {orderType === "LIMIT" && (
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">
                      Order Value
                    </Label>
                    <div className="text-lg text-white font-bold">
                      {quantity.mul(price).toFixed(2)}
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-4">
                  <Button
                    onClick={() => {
                      setCurrentTab("BUY");
                      handlePlaceOrder("BUY");
                    }}
                    className="w-full bg-green-400 text-white hover:bg-green-500 font-semibold"
                  >
                    {`Place ${orderType} Buy Order`}
                  </Button>
                  <Button
                    onClick={() => {
                      setCurrentTab("SELL");
                      handlePlaceOrder("SELL");
                    }}
                    variant="destructive"
                    className="w-full border-slate-600 text-white "
                  >
                    {`Place ${orderType} Sell Order`}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
