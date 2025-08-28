"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState } from "react"

const MARKET_DATA = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC/USD",
    price: 113038.1,
    volume24h: 5.9,
    marketCap: 2.2,
    change24h: 1.32,
    sparkline: [100, 102, 98, 105, 103, 108, 106, 110, 113],
    icon: "₿",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH/USD",
    price: 4576.7,
    volume24h: 22.8,
    marketCap: 550.9,
    change24h: -1.11,
    sparkline: [100, 95, 98, 102, 99, 96, 94, 97, 95],
    icon: "Ξ",
  },
  {
    id: "usdt",
    name: "USDT",
    symbol: "USDT/USD",
    price: 1.0,
    volume24h: 2.0,
    marketCap: 167.3,
    change24h: -0.01,
    sparkline: [100, 100, 99.9, 100, 100.1, 100, 99.9, 100, 100],
    icon: "₮",
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL/USD",
    price: 212.38,
    volume24h: 50.4,
    marketCap: 114.1,
    change24h: 3.5,
    sparkline: [100, 98, 102, 105, 108, 106, 110, 112, 115],
    icon: "◎",
  },
  {
    id: "dogecoin",
    name: "Dogecoin",
    symbol: "DOGE/USD",
    price: 0.22355,
    volume24h: 34.1,
    marketCap: 33.6,
    change24h: 0.2,
    sparkline: [100, 99, 101, 102, 100, 101, 103, 102, 101],
    icon: "Ð",
  },
  {
    id: "chainlink",
    name: "Chainlink",
    symbol: "LINK/USD",
    price: 24.047,
    volume24h: 24.2,
    marketCap: 16.4,
    change24h: -1.45,
    sparkline: [100, 102, 98, 95, 97, 94, 96, 98, 95],
    icon: "⬡",
  },
  {
    id: "sui",
    name: "Sui",
    symbol: "SUI/USD",
    price: 3.5077,
    volume24h: 997.2,
    marketCap: 12.3,
    change24h: 0.28,
    sparkline: [100, 99, 101, 103, 102, 104, 103, 105, 104],
    icon: "🌊",
  },
]

export default function MarketDashboard() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "price" | "change24h" | "marketCap">("marketCap")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const filteredData = MARKET_DATA.filter(
    (coin) =>
      coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
  ).sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortOrder === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal)
  })

  const formatPrice = (price: number) => {
    if (price < 1) return `$${price.toFixed(5)}`
    if (price < 100) return `$${price.toFixed(3)}`
    return `$${price.toLocaleString()}`
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}B`
    return `$${volume.toFixed(1)}M`
  }

  const Sparkline = ({ data, isPositive }: { data: number[]; isPositive: boolean }) => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1

    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * 60
        const y = 20 - ((value - min) / range) * 20
        return `${x},${y}`
      })
      .join(" ")

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
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/50 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-7 gap-4 px-6 py-4 border-b border-slate-800/50 text-sm font-medium text-slate-400">
            <button
              onClick={() => {
                setSortBy("name")
                setSortOrder(sortBy === "name" && sortOrder === "desc" ? "asc" : "desc")
              }}
              className="text-left hover:text-white transition-colors"
            >
              Name
            </button>
            <button
              onClick={() => {
                setSortBy("price")
                setSortOrder(sortBy === "price" && sortOrder === "desc" ? "asc" : "desc")
              }}
              className="text-right hover:text-white transition-colors"
            >
              Price
            </button>
            <div className="text-right">24h Volume</div>
            <button
              onClick={() => {
                setSortBy("marketCap")
                setSortOrder(sortBy === "marketCap" && sortOrder === "desc" ? "asc" : "desc")
              }}
              className="text-right hover:text-white transition-colors flex items-center justify-end"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Market Cap
            </button>
            <button
              onClick={() => {
                setSortBy("change24h")
                setSortOrder(sortBy === "change24h" && sortOrder === "desc" ? "asc" : "desc")
              }}
              className="text-right hover:text-white transition-colors"
            >
              24h Change
            </button>
            <div className="text-right">Last 7 Days</div>
            <div></div>
          </div>

          <div className="divide-y divide-slate-800/30">
            {filteredData.map((coin) => (
              <div
                key={coin.id}
                className="grid grid-cols-7 gap-4 px-6 py-4 hover:bg-slate-800/20 transition-colors cursor-pointer group"
                onClick={() => router.push(`/trade/${coin.symbol.split("/")[0]}`)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full flex items-center justify-center text-white font-bold">
                    {coin.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {coin.name}
                    </div>
                    <div className="text-sm text-slate-400">{coin.symbol}</div>
                  </div>
                </div>

                <div className="text-right text-white font-semibold">{formatPrice(coin.price)}</div>

                <div className="text-right text-slate-300">{formatVolume(coin.volume24h)}</div>

                <div className="text-right text-slate-300">{formatVolume(coin.marketCap)}B</div>

                <div
                  className={`text-right font-semibold ${coin.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {coin.change24h >= 0 ? "+" : ""}
                  {coin.change24h.toFixed(2)}%
                </div>

                <div className="text-right">
                  <Sparkline data={coin.sparkline} isPositive={coin.change24h >= 0} />
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
  )
}
