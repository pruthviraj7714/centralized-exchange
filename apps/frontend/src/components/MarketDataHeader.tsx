import { IMarketData, IUpdatedMarketData } from "@/types/market";
import { TrendingUp } from "lucide-react";
import Decimal from "decimal.js";

interface MarketDataHeaderProps {
  marketData: IMarketData;
  updatedMarketData: IUpdatedMarketData | null;
  isConnected: boolean;
  currentTime: Date;
}

export default function MarketDataHeader({
  marketData,
  updatedMarketData,
  isConnected,
  currentTime,
}: MarketDataHeaderProps) {
  const live = {
    lastPrice: updatedMarketData?.lastPrice ?? marketData.price?.toString(),
    change: updatedMarketData?.change ?? marketData.priceChange,
    changePercent: updatedMarketData?.changePercent ?? marketData.change24h,
    high: updatedMarketData?.high ?? marketData.high24h?.toString(),
    low: updatedMarketData?.low ?? marketData.low24h?.toString(),
    volume: updatedMarketData?.volume ?? marketData.volume24h?.toString(),
  };

  const priceChange = new Decimal(live.change || 0);
  const change24h = new Decimal(live.changePercent || 0);
  const isPositive = priceChange.gt(0);
  const isPositive24h = change24h.gt(0);

  return (
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
                  <span className={`text-lg font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    ${live.lastPrice}
                  </span>
                  <TrendingUp
                    className={`w-4 h-4 ${
                      isPositive
                        ? "text-emerald-400"
                        : "text-red-400 rotate-180"
                    }`}
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">24h Change</span>
                <span
                  className={`${isPositive24h ? "text-emerald-400" : "text-red-400"} font-semibold`}
                >
                  {isPositive ? "+" : ""}
                  {priceChange.toFixed(2)} ({isPositive24h ? "+" : ""}
                  {change24h.toFixed(2)}%)
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">24h High</span>
                <span className="text-white font-semibold">${live.high}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">24h Low</span>
                <span className="text-white font-semibold">${live.low}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">24h Volume</span>
                <span className="text-white font-semibold">
                  {new Decimal(live.volume || 0).toFixed(2)} {marketData.baseAsset}
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
  );
}
