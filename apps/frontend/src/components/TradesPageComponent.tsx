"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Activity, Wallet } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useSession } from "next-auth/react";
import Decimal from "decimal.js";
import useOrderbook from "@/hooks/useOrderbook";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchMarketData } from "@/lib/api/market.api";
import { fetchUserBalanceForMarket } from "@/lib/api/user.api";
import { placeOrder } from "@/lib/api/order.api";

const INTERVALS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;
type ChartInterval = (typeof INTERVALS)[number];

export default function TradesPageComponent({ ticker }: { ticker: string }) {
  const [chartInterval, setChartInterval] = useState<ChartInterval>("1m");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [quantity, setQuantity] = useState<Decimal>(new Decimal(0));
  const [price, setPrice] = useState<Decimal>(new Decimal(0));
  const [activeTab, setActiveTab] = useState<"BUY" | "SELL">("BUY");
  const [spendAmount, setSpendAmount] = useState<Decimal>(new Decimal(0));
  const chartRef = useRef<HTMLDivElement>(null);
  const { data, status } = useSession();
  const isReady = status === "authenticated" && !!data?.accessToken;
  const [bids, setBids] = useState<
    {
      price: Decimal;
      quantity: Decimal;
      total: Decimal;
      requestId: string;
      orderCount: number;
    }[]
  >([]);
  const [asks, setAsks] = useState<
    {
      price: Decimal;
      quantity: Decimal;
      total: Decimal;
      requestId: string;
      orderCount: number;
    }[]
  >([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [baseAsset, quoteAsset] = ticker.split("-");
  const { isConnected, orderbook, recentTrades, error } = useOrderbook(ticker);
  const {
    data: marketData,
    isLoading: marketDataLoading,
    isError: marketDataError,
  } = useQuery({
    queryFn: () => fetchMarketData(ticker),
    queryKey: ["market-data", ticker],
    enabled: !!ticker,
    refetchInterval: 10000,
  });
  const {
    data: userBalancesData,
    isLoading: userBalancesLoading,
    isError: userBalancesError,
  } = useQuery({
    queryKey: ["user-balances", ticker],
    queryFn: () => fetchUserBalanceForMarket(ticker, data?.accessToken!),
    enabled: !!ticker && isReady,
    refetchInterval: 10000,
  });
  const { mutateAsync: placeOrderMutation } = useMutation({
    mutationFn: () =>
      placeOrder(
        ticker,
        activeTab,
        orderType === "MARKET" ? spendAmount : price,
        quantity,
        orderType,
        data?.accessToken!,
      ),
    mutationKey: ["place-order", ticker, activeTab, price, quantity, orderType],
    onSuccess: (data) => {
      toast.success(data.message ? data.message : "Order placed successfully", {
        position: "top-center",
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response.data.message
          ? error.response.data.message
          : "Failed to place order",
        { position: "top-center" },
      );
    },
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePriceClick = (priceValue: Decimal) => {
    setPrice(priceValue);
  };

  const handlePlaceOrder = async () => {
    if (!isReady) {
      toast.error("Please login to place an order", { position: "top-center" });
      return;
    }
    if (!quantity || (orderType === "LIMIT" && !price)) {
      toast.error("Please fill in all required fields", {
        position: "top-center",
      });
      return;
    }

    if (orderType === "MARKET" && activeTab === "BUY" && !spendAmount) {
      toast.error("Please enter a spend amount for market orders", {
        position: "top-center",
      });
      return;
    }
    
    await placeOrderMutation();
  };

  useEffect(() => {
    if (orderbook) {
      console.log("Updating orderbook display:", orderbook);

      const transformedBids = orderbook.bids.map((level, index) => ({
        price: Decimal(level.price),
        quantity: Decimal(level.totalQuantity),
        total: Decimal(level.totalQuantity).mul(index + 1), // Cumulative total
        requestId: `bid-${index}`,
        orderCount: level.orderCount,
      }));

      // Transform asks data for display
      const transformedAsks = orderbook.asks.map((level, index) => ({
        price: Decimal(level.price),
        quantity: Decimal(level.totalQuantity),
        total: Decimal(level.totalQuantity).mul(index + 1), // Cumulative total
        requestId: `ask-${index}`,
        orderCount: level.orderCount,
      }));

      setBids(transformedBids);
      setAsks(transformedAsks);

      // Update last price from recent trades
      if (recentTrades.length > 0) {
        setPrice(Decimal(recentTrades[0].price));
      }
    }
  }, [orderbook, recentTrades]);

  useEffect(() => {
    if (error) {
      toast.error(error, { position: "top-center" });
    }
  }, [error]);

  const spread =
    asks[0] && bids[0] ? asks[0].price.sub(bids[0].price).toFixed(2) : "0.00";
  const spreadPercent =
    asks[0] && bids[0]
      ? asks[0].price.sub(bids[0].price).div(bids[0].price).mul(100).toFixed(3)
      : "0.000";

  const totalValue =
    orderType === "LIMIT" && price && quantity
      ? price.mul(quantity).toFixed(2)
      : orderType === "MARKET" && quantity
        ? (new Decimal(marketData?.price) ?? new Decimal(0))
            .mul(quantity)
            .toFixed(2)
        : "0.00";

  const maxBidDepth = Math.max(...bids.map((b) => b.total.toNumber()));
  const maxAskDepth = Math.max(...asks.map((a) => a.total.toNumber()));
  const maxDepth = Math.max(maxBidDepth, maxAskDepth);

  if (marketDataLoading) {
    return <div>Loading...</div>;
  }

  if (marketDataError) {
    return <div>Error fetching market data</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-8">
              <div className="flex items-center gap-3">
                <img
                  src={marketData?.logo}
                  alt="SOL"
                  className="h-8 w-8 object-contain rounded-full border border-slate-700"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">
                      {marketData.baseAsset}/{marketData.quoteAsset}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${isConnected ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      {isConnected ? "● LIVE" : "● OFFLINE"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">Spot Trading</div>
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-6 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Last Price</span>
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-emerald-400">
                      ${marketData.price.toString()}
                    </span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">24h Change</span>
                  <span className="text-emerald-400 font-semibold">
                    +{marketData.priceChange} (+{marketData.change24h}%)
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">24h High</span>
                  <span className="text-white font-semibold">
                    ${marketData.high24h.toString()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">24h Low</span>
                  <span className="text-white font-semibold">
                    ${marketData.low24h.toString()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">24h Volume</span>
                  <span className="text-white font-semibold">
                    {marketData.volume24h.toLocaleString()} SOL
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 hidden md:block">
              {currentTime.toLocaleString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}{" "}
              UTC
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[calc(100vh-120px)]">
          <div className="lg:col-span-6 xl:col-span-7">
            <div className="h-full bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    {INTERVALS.map((iv) => (
                      <button
                        key={iv}
                        className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                          iv === chartInterval
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                        onClick={() => setChartInterval(iv)}
                      >
                        {iv}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-400">TradingView Chart</span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div
                  ref={chartRef}
                  className="w-full h-[500px] bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center"
                >
                  <div className="text-center">
                    <Activity className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">Chart Loading...</p>
                    <p className="text-slate-600 text-sm mt-2">
                      TradingView integration goes here
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 xl:col-span-2">
            <div className="h-full bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  Order Book
                </h2>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800">
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 font-medium">
                    <span>Price ({quoteAsset})</span>
                    <span className="text-right">Size ({baseAsset})</span>
                    <span className="text-right">Total</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  <div className="px-4 py-2">
                    {asks
                      .slice(0, 10)
                      .reverse()
                      .map((ask, index) => {
                        const depthPercent =
                          (ask.total.toNumber() / maxDepth) * 100;
                        return (
                          <div
                            key={`ask-${index}`}
                            className="relative grid grid-cols-3 gap-2 text-sm py-1 hover:bg-red-500/10 cursor-pointer rounded transition-colors group"
                            onClick={() => handlePriceClick(ask.price)}
                          >
                            <div
                              className="absolute right-0 top-0 bottom-0 bg-red-500/10 transition-all group-hover:bg-red-500/15"
                              style={{ width: `${depthPercent}%` }}
                            />
                            <span className="text-red-400 font-mono relative z-10">
                              {ask.price.toFixed(2)}
                            </span>
                            <span className="text-slate-300 font-mono text-right relative z-10">
                              {ask.quantity.toFixed(4)}
                            </span>
                            <span className="text-slate-500 font-mono text-right text-xs relative z-10">
                              {ask.total.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                  </div>

                  <div className="px-4 py-3 border-y border-slate-800 bg-slate-900/30 sticky top-0 z-10">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-400 mb-1">
                        ${marketData.price.toString()}
                      </div>
                      <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                        <span>Spread: ${spread}</span>
                        <span>({spreadPercent}%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2">
                    {bids.slice(0, 10).map((bid, index) => {
                      const depthPercent =
                        (bid.total.toNumber() / maxDepth) * 100;
                      return (
                        <div
                          key={`bid-${index}`}
                          className="relative grid grid-cols-3 gap-2 text-sm py-1 hover:bg-emerald-500/10 cursor-pointer rounded transition-colors group"
                          onClick={() => handlePriceClick(bid.price)}
                        >
                          <div
                            className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 transition-all group-hover:bg-emerald-500/15"
                            style={{ width: `${depthPercent}%` }}
                          />
                          <span className="text-emerald-400 font-mono relative z-10">
                            {bid.price.toFixed(2)}
                          </span>
                          <span className="text-slate-300 font-mono text-right relative z-10">
                            {bid.quantity.toFixed(4)}
                          </span>
                          <span className="text-slate-500 font-mono text-right text-xs relative z-10">
                            {bid.total.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 xl:col-span-3">
            <div className="h-full bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                <div className="flex gap-2">
                  <button
                    className={`flex-1 px-4 py-2 text-sm font-semibold rounded transition-all ${
                      orderType === "LIMIT"
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                    onClick={() => setOrderType("LIMIT")}
                  >
                    Limit
                  </button>
                  <button
                    className={`flex-1 px-4 py-2 text-sm font-semibold rounded transition-all ${
                      orderType === "MARKET"
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                    onClick={() => setOrderType("MARKET")}
                  >
                    Market
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/50 rounded-lg">
                  <button
                    className={`py-2 text-sm font-semibold rounded transition-all ${
                      activeTab === "BUY"
                        ? "bg-emerald-600 text-white shadow-lg"
                        : "text-slate-400 hover:text-white"
                    }`}
                    onClick={() => setActiveTab("BUY")}
                  >
                    Buy
                  </button>
                  <button
                    className={`py-2 text-sm font-semibold rounded transition-all ${
                      activeTab === "SELL"
                        ? "bg-red-600 text-white shadow-lg"
                        : "text-slate-400 hover:text-white"
                    }`}
                    onClick={() => setActiveTab("SELL")}
                  >
                    Sell
                  </button>
                </div>

                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Wallet className="w-3 h-3" />
                      Available
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {userBalancesLoading ? (
                        <div className="w-20 h-5 bg-slate-800/50 rounded animate-pulse"></div>
                      ) : activeTab === "BUY" ? (
                        userBalancesData?.quoteAssetWallet.available
                      ) : (
                        userBalancesData?.baseAssetWallet.available
                      )}
                    </span>
                  </div>
                </div>

                {orderType === "LIMIT" && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300 font-medium">
                      Price ({quoteAsset})
                    </label>
                    <input
                      type="number"
                      value={price.toString()}
                      onChange={(e) => setPrice(new Decimal(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    />
                  </div>
                )}

                {orderType === "MARKET" && activeTab === "BUY" && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300 font-medium">
                      Spend Amount ({quoteAsset})
                    </label>
                    <input
                      type="text"
                      value={spendAmount.toString()}
                      onChange={(e) =>
                        setSpendAmount(new Decimal(e.target.value))
                      }
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    />
                  </div>
                )}

                {orderType === "MARKET" && activeTab === "SELL" && (
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300 font-medium">
                      Quantity ({baseAsset})
                    </label>
                    <input
                      type="text"
                      value={new Decimal(quantity).toString()}
                      onChange={(e) => setQuantity(new Decimal(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                    />
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {["25%", "50%", "75%", "100%"].map((percent) => (
                    <button
                      key={percent}
                      className="py-2 text-xs font-medium text-slate-400 bg-slate-900/50 border border-slate-700 rounded hover:border-emerald-500 hover:text-emerald-400 transition-all"
                    >
                      {percent}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Value</span>
                    <span className="text-white font-bold">${totalValue}</span>
                  </div>
                  {orderType === "LIMIT" && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Est. Fee (0.1%)</span>
                      <span className="text-slate-400">
                        ${(parseFloat(totalValue) * 0.001).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handlePlaceOrder}
                  className={`w-full py-4 text-base font-bold rounded-lg transition-all shadow-lg ${
                    activeTab === "BUY"
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/30"
                      : "bg-red-600 hover:bg-red-500 text-white shadow-red-500/30"
                  }`}
                >
                  {activeTab === "BUY" ? "Place Buy Order" : "Place Sell Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
