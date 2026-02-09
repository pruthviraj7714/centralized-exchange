import { IMarketData } from "@/types/market";
import { TrendingUp } from "lucide-react";

interface MarketDataHeaderProps {
  marketData: IMarketData;
  isConnected: boolean;
  currentTime: Date;
}

export default function MarketDataHeader({
  marketData,
  isConnected,
  currentTime,
}: MarketDataHeaderProps) {
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
                  {marketData?.volume24h?.toLocaleString()} SOL
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
