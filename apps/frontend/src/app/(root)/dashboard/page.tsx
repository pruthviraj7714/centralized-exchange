"use client";
import { Button } from "@/components/ui/button";
import { BACKEND_URL } from "@/lib/config";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TrendingUp, Sparkles, Star } from "lucide-react";

interface IMarketData {
  id: string;
  price: number | null;
  ticker: string;
  logo: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  volume24h: number | null;
  marketCap: number | null;
  change24h: number | null;
  sparkline7d: number[];
  createdAt: Date;
  updatedAt: Date;
}

export default function MarketDashboard() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "price" | "change24h" | "marketCap"
  >("marketCap");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [marketData, setMarketData] = useState<IMarketData[]>([]);

  const fetchMarketData = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/market/all`);
      setMarketData(res.data.markets);
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? error.message);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  const formatPrice = (price: number | null) => {
    if (price == null) return "-";
    if (price < 1) return `$${price.toFixed(5)}`;
    if (price < 100) return `$${price.toFixed(3)}`;
    return `$${price.toLocaleString()}`;
  };

  const formatNumber = (num: number | null) => {
    if (num == null) return "-";
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  const Sparkline = ({
    data,
    isPositive,
  }: {
    data: number[];
    isPositive: boolean;
  }) => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * 60;
        const y = 20 - ((value - min) / range) * 20;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg width="60" height="20" className="inline-block">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? "#10b981" : "#ef4444"}
          strokeWidth="1.5"
          className="opacity-80"
        />
      </svg>
    );
  };

  // Get categorized data
  const getNewCoins = () => {
    return [...marketData]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  };

  const getTopGainers = () => {
    return [...marketData]
      .filter(coin => coin.change24h !== null && coin.change24h > 0)
      .sort((a, b) => (b.change24h || 0) - (a.change24h || 0))
      .slice(0, 5);
  };

  const getPopular = () => {
    return [...marketData]
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 5);
  };

  const CoinCard = ({ coin }: { coin: IMarketData }) => (
    <div
      className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-800/50 hover:bg-slate-800/40 hover:border-slate-700/50 transition-all cursor-pointer group"
      onClick={() => router.push(`/trade/${coin.ticker}`)}
    >
      <div className="flex items-center space-x-3">
        <img
          src={coin.logo}
          alt={coin.baseAsset}
          className="w-10 h-10 rounded-full border border-slate-700 object-contain bg-white p-1"
        />
        <div>
          <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
            {coin.baseAsset}
          </div>
          <div className="text-sm text-slate-500">{coin.ticker}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-white font-semibold">{formatPrice(coin.price)}</div>
        <div
          className={`text-sm font-medium ${
            coin.change24h && coin.change24h >= 0
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {coin.change24h != null
            ? `${coin.change24h >= 0 ? "+" : ""}${coin.change24h.toFixed(2)}%`
            : "-"}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Got USDT?
                </h1>
                <p className="text-slate-300">
                  Convert to USD with 0 fees and start trading!
                </p>
                <Button
                  className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6"
                  onClick={() => router.push("/trade/USDT_USD")}
                >
                  Trade USDT
                </Button>
              </div>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                <span className="text-5xl">₮</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Buy & Manage Assets
                </h1>
                <p className="text-slate-300">
                  Check your wallet balance and buy crypto instantly!
                </p>
                <Button
                  className="mt-4 bg-purple-500 hover:bg-purple-600 text-white font-semibold px-6"
                  onClick={() => router.push("/assets")}
                >
                  View Assets
                </Button>
              </div>
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-500/30">
                <span className="text-5xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* New Coins */}
          <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h2 className="text-xl font-bold text-white">New</h2>
            </div>
            <div className="space-y-3">
              {getNewCoins().map((coin) => (
                <CoinCard key={coin.id} coin={coin} />
              ))}
            </div>
          </div>

          <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Top Gainers</h2>
            </div>
            <div className="space-y-3">
              {getTopGainers().map((coin) => (
                <CoinCard key={coin.id} coin={coin} />
              ))}
            </div>
          </div>

          <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Star className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Popular</h2>
            </div>
            <div className="space-y-3">
              {getPopular().map((coin) => (
                <CoinCard key={coin.id} coin={coin} />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/50">
            <h2 className="text-2xl font-bold text-white">All Markets</h2>
          </div>
          <div className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-slate-800/50 text-sm font-medium text-slate-400">
            <button
              onClick={() => {
                setSortBy("name");
                setSortOrder(
                  sortBy === "name" && sortOrder === "desc" ? "asc" : "desc"
                );
              }}
              className="text-left hover:text-white transition-colors"
            >
              Name
            </button>
            <button
              onClick={() => {
                setSortBy("price");
                setSortOrder(
                  sortBy === "price" && sortOrder === "desc" ? "asc" : "desc"
                );
              }}
              className="text-right hover:text-white transition-colors"
            >
              Price
            </button>
            <div className="text-right">24h Volume</div>
            <button
              onClick={() => {
                setSortBy("marketCap");
                setSortOrder(
                  sortBy === "marketCap" && sortOrder === "desc"
                    ? "asc"
                    : "desc"
                );
              }}
              className="text-right hover:text-white transition-colors flex items-center justify-end"
            >
              Market Cap
            </button>
            <button
              onClick={() => {
                setSortBy("change24h");
                setSortOrder(
                  sortBy === "change24h" && sortOrder === "desc"
                    ? "asc"
                    : "desc"
                );
              }}
              className="text-right hover:text-white transition-colors"
            >
              24h Change
            </button>
            <div className="text-right">Last 7 Days</div>
            <div></div>
          </div>

          <div className="divide-y divide-slate-800/30">
            {marketData.map((coin) => (
              <div
                key={coin.id}
                className="grid grid-cols-7 gap-4 px-6 py-4 hover:bg-slate-800/20 transition-colors cursor-pointer group"
                onClick={() => router.push(`/trade/${coin.ticker}`)}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={coin.logo}
                    alt={coin.baseAsset}
                    className="w-10 h-10 rounded-full border border-slate-700 object-contain bg-white p-1"
                  />
                  <div>
                    <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {coin.baseAsset}
                    </div>
                    <div className="text-sm text-slate-400">{coin.ticker}</div>
                  </div>
                </div>

                <div className="text-right text-white font-semibold">
                  {formatPrice(coin.price)}
                </div>

                <div className="text-right text-slate-300">
                  {formatNumber(coin.volume24h)}
                </div>

                <div className="text-right text-slate-300">
                  {formatNumber(coin.marketCap)}
                </div>

                <div
                  className={`text-right font-semibold ${
                    coin.change24h && coin.change24h >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {coin.change24h != null
                    ? `${coin.change24h >= 0 ? "+" : ""}${coin.change24h.toFixed(2)}%`
                    : "-"}
                </div>

                <div className="text-right">
                  <Sparkline
                    data={coin.sparkline7d ?? []}
                    isPositive={!!coin.change24h && coin.change24h >= 0}
                  />
                </div>

                <div className="text-right">
                  <Button
                    size="sm"
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
                  >
                    Trade
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}