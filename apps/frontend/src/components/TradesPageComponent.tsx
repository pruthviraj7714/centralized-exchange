"use client";

import useSocket from "@/hooks/useSocket";
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
  const { isConnected, socket } = useSocket(ticker);
  const [interval, setInterval] = useState<Interval>("1m");
  const [currentTab, setCurrentTab] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [bids, setBids] = useState<IOrderResponse[]>([]);
  const [asks, setAsks] = useState<IOrderResponse[]>([]);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const lastCandleRef = useRef<Candle | null>(null);
  const candlestickSeriesRef = useRef<any | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const { data } = useSession();

  const fetchChartData = async () => {
    if (!data || !data.accessToken) return;
    try {
      const response = await axios.get(
        `${BACKEND_URL}/klines?symbol=${ticker.toUpperCase()}&interval=${interval}`,
        {
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
          },
        }
      );

      return response.data
        .filter(
          (candle: any) =>
            candle.open != null &&
            candle.high != null &&
            candle.low != null &&
            candle.close != null
        )
        .map((candle: any) => ({
          time: Math.floor(new Date(candle.bucket).getTime() / 1000),
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        }));
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch chart data");
      return [];
    }
  };

  const processTick = (price: number, timestamp: number) => {
    const time = Math.floor(timestamp / 1000);
    const interverSec = getIntervalSec(interval);

    const candleTime = Math.floor(time / interverSec) * interverSec;

    const lastCandle = lastCandleRef.current;
    if (!lastCandle || !candlestickSeriesRef.current) return;

    if (candleTime === lastCandle.time) {
      lastCandle.high = Math.max(lastCandle.high, price);
      lastCandle.low = Math.min(lastCandle.low, price);
      lastCandle.close = price;

      candlestickSeriesRef.current.update(lastCandle);
    } else {
      const newCandle: Candle = {
        time: candleTime as UTCTimestamp,
        open: price,
        high: price,
        low: price,
        close: price,
      };
      lastCandleRef.current = newCandle;
      candlestickSeriesRef.current.update(newCandle);
    }
  };

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

  useEffect(() => {
    if (!chartRef.current) return;

    const chartOptions: DeepPartial<ChartOptions> = {
      layout: {
        textColor: "#e5e7eb",
        background: { color: "#0b0b0b" },
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
    };
    const chart = createChart(chartRef.current, chartOptions);

    chart.applyOptions({
      width: chartRef.current.clientWidth,
      height: 500,
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      borderColor: "#404040",
    });

    candlestickSeriesRef.current = candlestickSeries;

    const loadData = async () => {
      const data = await fetchChartData();
      if (data.length > 0) {
        candlestickSeries.setData(data);
        lastCandleRef.current = data[data.length - 1];
        chart.timeScale().fitContent();
      }
    };

    loadData();

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr?.width) {
        chart.applyOptions({
          width: Math.floor(cr.width),
          height: 500,
        });
      }
    });
    ro.observe(chartRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      candlestickSeriesRef.current = null;
    };
  }, [ticker, interval, data]);

  useEffect(() => {
    if (socket && isConnected) {
      socket.send(
        JSON.stringify({
          type: "GET_ORDERBOOK",
        })
      );
    }
  }, [socket, isConnected, ticker]);

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = ({ data }) => {
      const payload = JSON.parse(data.toString());

      switch (payload.type) {
        case "ORDERBOOK_SNAPSHOT": {
          setBids(payload.bids);
          setAsks(payload.asks);
          setLastPrice(payload.lastPrice);
          processTick(payload.lastPrice, payload.timestamp);
          break;
        }
        case "ORDERBOOK_UPDATE": {
          setBids(payload.bids);
          setAsks(payload.asks);
          setLastPrice(payload.lastPrice);
          processTick(payload.lastPrice, payload.timestamp);
          break;
        }
      }
    };
  }, [socket, isConnected]);

  const transformedBids = useMemo(() => transformOrderbook(bids).slice(0,8), bids);
  const transformedAsks = useMemo(() => transformOrderbook(asks).slice(0,8), asks);
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
                    {transformedAsks
                      .slice(0, 8)
                      .reverse()
                      .map((ask) => (
                        <div
                          key={ask.requestId}
                          className="flex items-center justify-between text-sm hover:bg-red-900/10 px-2 py-1 rounded"
                        >
                          <span className="text-red-400 font-mono">
                            {ask.price.toFixed(2)}
                          </span>
                          <span className="text-slate-300 font-mono">
                            {ask.size}
                          </span>
                          <span className="text-slate-300 font-mono">
                            {ask.total}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="text-center py-2 border-y border-slate-800">
                  <div className="text-lg font-bold text-emerald-400">
                        {lastPrice}
                  </div>
                  <div className="text-xs text-slate-400">Spread: {asks[0]?.price - bids[0]?.price || 0}</div>
                </div>

                <div>
                  <div className="space-y-1">
                    {transformedBids
                      .slice(0, 8)
                      .map((bid) => (
                        <div
                          key={bid.requestId}
                          className="flex items-center justify-between text-sm hover:bg-emerald-900/10 px-2 py-1 rounded"
                        >
                          <span className="text-emerald-400 font-mono">
                            {bid.price.toFixed(2)}
                          </span>
                          <span className="text-slate-300 font-mono">
                            {bid.size}
                          </span>
                          <span className="text-slate-300 font-mono">
                            {bid.total}
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
                      onChange={(e) => setPrice(e.target.valueAsNumber)}
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
                    onChange={(e) => setQuantity(e.target.valueAsNumber)}
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
                      {(quantity * price).toFixed(2)}
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
