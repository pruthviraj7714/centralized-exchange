"use client";
import { useState, useEffect } from "react";
import { TrendingUp, Sparkles, Star, Search, ArrowUpDown, ChevronDown, Filter } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { useRouter } from "next/navigation";
import { Decimal } from "decimal.js";

interface IMarketData {
  id: string;
  price: string;
  ticker: string;
  logo: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  volume24h: string | null;
  marketCap: string | null;
  change24h: string | null;
  sparkline7d: string[];
  createdAt: Date;
  updatedAt: Date;
}


export default function MarketDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "change24h" | "marketCap">("marketCap");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [marketData, setMarketData] = useState<IMarketData[]>([]);
  const [filteredData, setFilteredData] = useState<IMarketData[]>([]);
  const router = useRouter();

  const fetchMarkets = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/markets`);
      setMarketData(response.data.markets);
    } catch (error) {
      toast.error("Failed to fetch markets");
    }
  }

  useEffect(() => {
    fetchMarkets();
  }, []);

  useEffect(() => {
    let filtered = marketData.filter(coin =>
      coin.baseAsset.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case "name":
          aVal = a.baseAsset;
          bVal = b.baseAsset;
          break;
        case "price":
          aVal = Decimal(a.price);
          bVal = Decimal(b.price);
          break;
        case "change24h":
          aVal = Decimal(a.change24h || "0");
          bVal = Decimal(b.change24h || "0");
          break;
        case "marketCap":
          aVal = Decimal(a.marketCap || "0");
          bVal = Decimal(b.marketCap || "0");
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredData(filtered);
  }, [searchTerm, sortBy, sortOrder, marketData]);

  const formatPrice = (price: string) => {
    if (price == null) return "-";
    if (Decimal(price).lt(1)) return `$${Decimal(price).toFixed(5)}`;
    if (Decimal(price).lt(100)) return `$${Decimal(price).toFixed(3)}`;
    return `$${Decimal(price).toLocaleString()}`;
  };

  const formatNumber = (num: string | null) => {
    if (num == null) return "-";
    if (Decimal(num).gte(1_000_000_000)) return `$${Decimal(num).div(1_000_000_000)}B`;
    if (Decimal(num).gte(1_000_000)) return `$${Decimal(num).div(1_000_000)}M`;
    if (Decimal(num).gte(1_000)) return `$${Decimal(num).div(1_000)}K`;
    return `$${Decimal(num)}`;
  };

  const Sparkline = ({ data, isPositive }: { data: string[]; isPositive: boolean }) => {
    if (!data || data.length === 0) return <div className="w-20 h-8" />;

    const max = Math.max(...data.map(d => Decimal(d).toNumber()));
    const min = Math.min(...data.map(d => Decimal(d).toNumber()));
    const range = max - min || 1;

    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * 80;
        const y = 32 - ((Decimal(value).toNumber() - min) / range) * 32;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg width="80" height="32" className="inline-block">
        <defs>
          <linearGradient id={`gradient-${isPositive ? 'up' : 'down'}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
            <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={`0,32 ${points} 80,32`}
          fill={`url(#gradient-${isPositive ? 'up' : 'down'})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? "#10b981" : "#ef4444"}
          strokeWidth="2"
          className="opacity-90"
        />
      </svg>
    );
  };

  const getNewCoins = () => {
    return [...marketData]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  };

  const getTopGainers = () => {
    return [...marketData]
      .filter(coin => coin.change24h !== null && Decimal(coin.change24h || "0").toNumber() > 0)
      .sort((a, b) => (Decimal(b.change24h || "0").toNumber() - Decimal(a.change24h || "0").toNumber()))
      .slice(0, 5);
  };

  const getPopular = () => {
    return [...marketData]
      .sort((a, b) => (Decimal(b.marketCap || "0").toNumber() - Decimal(a.marketCap || "0").toNumber()))
      .slice(0, 5);
  };

  const CoinCard = ({ coin }: { coin: IMarketData }) => (
    <div
      className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-800/50 hover:bg-slate-800/60 hover:border-emerald-500/30 transition-all cursor-pointer group"
      onClick={() => router.push(`/trade/${coin.symbol}`)}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="relative">
          <img
            src={coin.logo}
            alt={coin.baseAsset}
            className="w-9 h-9 rounded-full border border-slate-700/50 object-contain bg-white p-1 group-hover:border-emerald-500/50 transition-colors"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white text-sm group-hover:text-emerald-400 transition-colors truncate">
            {coin.baseAsset}
          </div>
          <div className="text-xs text-slate-500 truncate">{coin.symbol}</div>
        </div>
      </div>
      <div className="text-right ml-2">
        <div className="text-white font-semibold text-sm">{formatPrice(coin.price)}</div>
        <div
          className={`text-xs font-medium ${
            coin.change24h && Decimal(coin.change24h || "0").toNumber() >= 0 ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {coin.change24h != null ? `${Decimal(coin.change24h || "0").toNumber() >= 0 ? "+" : ""}${Decimal(coin.change24h || "0").toNumber().toFixed(2)}%` : "-"}
        </div>
      </div>
    </div>
  );

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Markets
          </h1>
          <p className="text-slate-400">Trade cryptocurrencies with zero fees and instant execution</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/30 rounded-2xl p-6 backdrop-blur-sm group hover:border-emerald-500/50 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full mb-3">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  ZERO FEES
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Got USDT?</h2>
                <p className="text-slate-300 text-sm mb-4">
                  Convert to USD instantly and start trading with no hidden charges
                </p>
                <button className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50">
                  Trade USDT Now
                </button>
              </div>
              <div className="hidden sm:flex w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 items-center justify-center shadow-2xl shadow-emerald-500/40">
                <span className="text-4xl">₮</span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm group hover:border-purple-500/50 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all" />
            <div className="relative flex items-center justify-between">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-full mb-3">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                  PORTFOLIO
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Manage Assets</h2>
                <p className="text-slate-300 text-sm mb-4">
                  Track your portfolio and buy crypto instantly with one click
                </p>
                <button className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50">
                  View Portfolio
                </button>
              </div>
              <div className="hidden sm:flex w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 items-center justify-center shadow-2xl shadow-purple-500/40">
                <span className="text-4xl">💰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Lists */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl overflow-hidden hover:border-slate-700/50 transition-all">
            <div className="p-4 border-b border-slate-800/50 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </div>
                <h3 className="text-lg font-bold text-white">New Listings</h3>
              </div>
            </div>
            <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {getNewCoins().map((coin) => (
                <CoinCard key={coin.id} coin={coin} />
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl overflow-hidden hover:border-slate-700/50 transition-all">
            <div className="p-4 border-b border-slate-800/50 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Top Gainers</h3>
              </div>
            </div>
            <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {getTopGainers().map((coin) => (
                <CoinCard key={coin.id} coin={coin} />
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl overflow-hidden hover:border-slate-700/50 transition-all">
            <div className="p-4 border-b border-slate-800/50 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Star className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Most Popular</h3>
              </div>
            </div>
            <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {getPopular().map((coin) => (
                <CoinCard key={coin.id} coin={coin} />
              ))}
            </div>
          </div>
        </div>

        {/* All Markets Table */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-800/50 bg-slate-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-2xl font-bold text-white">All Markets</h2>
              
              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search markets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors group"
                    >
                      Name
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleSort("price")}
                      className="flex items-center gap-2 ml-auto text-sm font-semibold text-slate-400 hover:text-white transition-colors group"
                    >
                      Price
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-slate-400">24h Volume</span>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleSort("marketCap")}
                      className="flex items-center gap-2 ml-auto text-sm font-semibold text-slate-400 hover:text-white transition-colors group"
                    >
                      Market Cap
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleSort("change24h")}
                      className="flex items-center gap-2 ml-auto text-sm font-semibold text-slate-400 hover:text-white transition-colors group"
                    >
                      24h Change
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-slate-400">Last 7 Days</span>
                  </th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {filteredData.map((coin) => (
                  <tr
                    key={coin.id}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/trade/${coin.symbol}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={coin.logo}
                          alt={coin.baseAsset}
                          className="w-10 h-10 rounded-full border border-slate-700/50 object-contain bg-white p-1 group-hover:border-emerald-500/50 transition-colors"
                        />
                        <div>
                          <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                            {coin.baseAsset}
                          </div>
                          <div className="text-sm text-slate-500">{coin.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-semibold">{formatPrice(coin.price)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-slate-300">{formatNumber(coin.volume24h)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-slate-300">{formatNumber(coin.marketCap)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-semibold ${
                          coin.change24h && Decimal(coin.change24h || "0").toNumber() >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {coin.change24h != null
                          ? `${Decimal(coin.change24h || "0").toNumber() >= 0 ? "+" : ""}${Decimal(coin.change24h || "0").toNumber()}%`
                          : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Sparkline
                        data={coin.sparkline7d ?? []}
                        isPositive={!!coin.change24h && Decimal(coin.change24h || "0").toNumber() >= 0}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg font-medium text-sm transition-all">
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-slate-800/30">
            {filteredData.map((coin) => (
              <div
                key={coin.id}
                className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
                onClick={() => alert(`Navigate to /trade/${coin.symbol}`)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={coin.logo}
                      alt={coin.baseAsset}
                      className="w-12 h-12 rounded-full border border-slate-700/50 object-contain bg-white p-1"
                    />
                    <div>
                      <div className="font-semibold text-white">{coin.baseAsset}</div>
                      <div className="text-sm text-slate-500">{coin.symbol}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">{formatPrice(coin.price)}</div>
                    <div
                      className={`text-sm font-semibold ${
                        coin.change24h && Decimal(coin.change24h || "0").toNumber() >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {coin.change24h != null
                        ? `${Decimal(coin.change24h || "0").toNumber() >= 0 ? "+" : ""}${Decimal(coin.change24h || "0").toNumber()}%`
                        : "-"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="text-slate-500 text-xs">Market Cap</div>
                    <div className="text-slate-300">{formatNumber(coin.marketCap)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500 text-xs">24h Volume</div>
                    <div className="text-slate-300">{formatNumber(coin.volume24h)}</div>
                  </div>
                  <div>
                    <Sparkline
                      data={coin.sparkline7d ?? []}
                      isPositive={!!coin.change24h && Decimal(coin.change24h || "0").toNumber() >= 0}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredData.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-slate-500 text-lg mb-2">No markets found</div>
              <p className="text-slate-600 text-sm">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}