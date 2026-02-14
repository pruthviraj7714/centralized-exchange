"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Decimal from "decimal.js";
import useOrderbook from "@/hooks/useOrderbook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMarketCandlesData, fetchMarketData } from "@/lib/api/market.api";
import {
  fetchUserBalanceForMarket,
  fetchUserOpenOrders,
  fetchUserOrdersHistory,
  fetchUserTrades,
} from "@/lib/api/user.api";
import { cancelOrder, placeOrder } from "@/lib/api/order.api";
import { IOrder, BottomTab } from "@/types/order";
import { IOrderBookOrder } from "@/types/orderbook";
import { ITrade } from "@/types/trade";
import BottomOrdersComponent from "./BottomOrdersComponent";
import MarketDataHeader from "./MarketDataHeader";
import PlaceOrderComponent from "./PlaceOrderComponent";
import OrderBookPanel from "./OrderBookPanel";
import MarketChart from "./MarketChart";
import { ChartInterval, ICandle } from "@/types/chart";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { ErrorState } from "./ErrorState";
import { useRouter } from "next/navigation";

export default function TradesPageComponent({ ticker }: { ticker: string }) {
  const [chartInterval, setChartInterval] = useState<ChartInterval>("1m");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [quantity, setQuantity] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"BUY" | "SELL">("BUY");
  const [spendAmount, setSpendAmount] = useState<string>("");
  const { data, status } = useSession();
  const isReady = status === "authenticated" && !!data?.accessToken;
  const [orderBookTab, setOrderBookTab] = useState<"ORDER_BOOK" | "TRADES">(
    "ORDER_BOOK",
  );
  const [bottomTab, setBottomTab] = useState<BottomTab>("OPEN_ORDERS");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mergedCandles, setMergedCandles] = useState<ICandle[]>([]);
  const router = useRouter();

  const [baseAsset, quoteAsset] = ticker.split("-");
  const {
    isConnected,
    recentTrades,
    candles: liveCandles,
    updatedMarketData,
    asks,
    bids,
    error,
  } = useOrderbook(ticker, chartInterval);
  const queryClient = useQueryClient();
  const {
    data: marketData,
    isLoading: marketDataLoading,
    isError: marketDataError,
  } = useQuery({
    queryFn: () => fetchMarketData(ticker),
    queryKey: ["market-data", ticker],
    enabled: !!ticker,
    refetchInterval: isConnected ? false : 10000,
  });

  const {
    data: marketCandlesData,
    isLoading: marketCandlesLoading,
    isError: marketCandlesError,
  } = useQuery({
    queryKey: ["market-candles", ticker, chartInterval],
    queryFn: () => fetchMarketCandlesData(ticker, chartInterval),
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

  const { data: userOrdersData } = useQuery<IOrder[]>({
    queryKey: ["user-orders", ticker],
    queryFn: () => fetchUserOpenOrders(marketData.id, data?.accessToken!),
    enabled: !!ticker && !!marketData && isReady,
    refetchInterval: 10000,
  });

  const { data: userOrdersHistoryData } = useQuery<IOrder[]>({
    queryKey: ["user-orders-history", ticker],
    queryFn: () => fetchUserOrdersHistory(marketData.id, data?.accessToken!),
    enabled: !!ticker && !!marketData && isReady,
    refetchInterval: 10000,
  });

  const { data: userTradesData } = useQuery<ITrade[]>({
    queryKey: ["user-trades", ticker],
    queryFn: () => fetchUserTrades(marketData.id, data?.accessToken!),
    enabled: !!ticker && !!marketData && isReady,
    refetchInterval: 10000,
  });

  const { mutateAsync: placeOrderMutation } = useMutation({
    mutationFn: () =>
      placeOrder(
        ticker,
        activeTab,
        orderType,
        data?.accessToken!,
        new Decimal(quantity || 0),
        new Decimal(spendAmount || 0),
        new Decimal(price || 0),
      ),
    mutationKey: ["place-order", ticker, activeTab, price, quantity, orderType],
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["user-orders", ticker],
      });
      toast.success(data.message ? data.message : "Order placed successfully", {
        position: "top-center",
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message
          ? error.response?.data?.message
          : "Failed to place order",
        { position: "top-center" },
      );
    },
  });

  const { mutateAsync: cancelOrderMutation } = useMutation({
    mutationFn: (orderId: string) => cancelOrder(orderId, data?.accessToken!),
    mutationKey: ["cancel-order", ticker],
    onSuccess: (data: { message?: string }) => {
      queryClient.invalidateQueries({
        queryKey: ["user-orders", ticker],
      });
      toast.success(
        data.message ? data.message : "Order cancelled successfully",
        {
          position: "top-center",
        },
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response.data.message
          ? error.response.data.message
          : "Failed to cancel order",
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

  useEffect(() => {
    setMergedCandles([]);
  }, [chartInterval]);

  useEffect(() => {
    if (!marketCandlesData || marketCandlesData.length === 0) return;

    const sorted = [...marketCandlesData]
      .sort(
        (a, b) =>
          new Date(a.openTime).getTime() - new Date(b.openTime).getTime(),
      )
      .filter(
        (candle, index, arr) =>
          index === 0 ||
          new Date(candle.openTime).getTime() !==
            new Date(arr[index - 1].openTime).getTime(),
      );

    setMergedCandles(sorted);
  }, [marketCandlesData]);

  useEffect(() => {
    if (!liveCandles || liveCandles.length === 0) return;

    setMergedCandles((prev) => {
      if (prev.length === 0) return liveCandles;

      const candleMap = new Map<number, ICandle>();

      prev.forEach((c) => {
        candleMap.set(new Date(c.openTime).getTime(), c);
      });

      liveCandles.forEach((c) => {
        candleMap.set(new Date(c.openTime).getTime(), c);
      });

      return Array.from(candleMap.values()).sort(
        (a, b) =>
          new Date(a.openTime).getTime() - new Date(b.openTime).getTime(),
      );
    });
  }, [liveCandles]);

  const handlePriceClick = (priceValue: string) => {
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

  const handlePlaceOrderDisabled = () => {
    if (!isReady || !quantity || (orderType === "LIMIT" && !price)) return true;
    if (
      orderType === "LIMIT" &&
      (!price || new Decimal(price).eq(0)) &&
      (!quantity || new Decimal(quantity).eq(0))
    )
      return true;
    if (
      orderType === "MARKET" &&
      activeTab === "BUY" &&
      (!spendAmount || new Decimal(spendAmount).eq(0))
    )
      return true;
    if (
      orderType === "MARKET" &&
      activeTab === "SELL" &&
      (!quantity || new Decimal(quantity).eq(0))
    )
      return true;
    return false;
  };

  const handleSetQuantity = (percent: string) => {
    const baseAssetBalance =
      userBalancesData?.baseAssetWallet.available || new Decimal(0);
    const quoteAssetBalance =
      userBalancesData?.quoteAssetWallet.available || new Decimal(0);

    if (orderType === "LIMIT" && activeTab === "BUY") {
      if (percent === "max") {
        setPrice(quoteAssetBalance);
        return;
      }
      const percentage = new Decimal(percent.replace("%", ""));
      const total = quoteAssetBalance.mul(percentage).div(100);
      setPrice(total);
    } else if (orderType === "LIMIT" && activeTab === "SELL") {
      if (percent === "max") {
        setQuantity(baseAssetBalance);
        return;
      }
      const percentage = new Decimal(percent.replace("%", ""));
      const total = baseAssetBalance.mul(percentage).div(100);
      setQuantity(total);
    } else if (orderType === "MARKET" && activeTab === "BUY") {
      if (percent === "max") {
        setSpendAmount(quoteAssetBalance);
        return;
      }
      const percentage = new Decimal(percent.replace("%", ""));
      const total = quoteAssetBalance.mul(percentage).div(100);
      setSpendAmount(total);
    } else if (orderType === "MARKET" && activeTab === "SELL") {
      if (percent === "max") {
        setQuantity(baseAssetBalance);
        return;
      }
      const percentage = new Decimal(percent.replace("%", ""));
      const total = baseAssetBalance.mul(percentage).div(100);
      setQuantity(total);
    }
  };

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
      ? new Decimal(price).mul(quantity).toFixed(2)
      : orderType === "MARKET" && quantity
        ? (new Decimal(marketData?.price || 0))
            .mul(quantity)
            .toFixed(2)
        : "0.00";

  const maxDepth = useMemo(() => {
    const maxBid = Math.max(...bids.map((b) => b.total.toNumber()));
    const maxAsk = Math.max(...asks.map((a) => a.total.toNumber()));
    return Math.max(maxBid, maxAsk);
  }, [bids, asks]);

  const livePrice =
    updatedMarketData?.lastPrice ?? marketData?.price?.toString() ?? "0";

  if (marketDataLoading) {
    return <LoadingSkeleton pageType="market" />;
  }

  if (marketDataError) {
    return (
      <ErrorState
        pageType="market"
        onRetry={() => {
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <MarketDataHeader
        marketData={marketData}
        updatedMarketData={updatedMarketData}
        isConnected={isConnected}
        currentTime={currentTime}
      />

      <div className="max-w-[1920px] mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[calc(80vh-120px)]">
          <div className="lg:col-span-6 xl:col-span-7">
            <MarketChart
              chartInterval={chartInterval}
              setChartInterval={setChartInterval}
              candles={mergedCandles}
            />
          </div>

          <div className="lg:col-span-2 xl:col-span-2">
            <OrderBookPanel
              baseAsset={baseAsset}
              quoteAsset={quoteAsset}
              asks={asks}
              bids={bids}
              lastPrice={livePrice}
              handlePriceClick={handlePriceClick}
              recentTrades={recentTrades}
              maxDepth={maxDepth}
              spread={spread}
              spreadPercent={spreadPercent}
              orderBookTab={orderBookTab}
              setOrderBookTab={setOrderBookTab}
            />
          </div>

          <div className="lg:col-span-3 xl:col-span-3">
            <PlaceOrderComponent
              activeTab={activeTab}
              baseAsset={baseAsset}
              quoteAsset={quoteAsset}
              price={price}
              orderType={orderType}
              totalValue={totalValue}
              quantity={quantity}
              spendAmount={spendAmount}
              setSpendAmount={setSpendAmount}
              setQuantity={setQuantity}
              setPrice={setPrice}
              userBalancesData={userBalancesData}
              userBalancesLoading={userBalancesLoading}
              setActiveTab={setActiveTab}
              handlePlaceOrder={handlePlaceOrder}
              handlePlaceOrderDisabled={handlePlaceOrderDisabled}
              handleSetQuantity={handleSetQuantity}
              setOrderType={setOrderType}
            />
          </div>
        </div>
        <div className="max-w-[1920px] mx-auto mt-4">
          <BottomOrdersComponent
            bottomTab={bottomTab}
            setBottomTab={setBottomTab}
            baseAsset={baseAsset}
            quoteAsset={quoteAsset}
            cancelOrderMutation={cancelOrderMutation}
            userOrdersData={userOrdersData || []}
            userOrdersHistoryData={userOrdersHistoryData || []}
            userTradesData={userTradesData || []}
          />
        </div>
      </div>
    </div>
  );
}
