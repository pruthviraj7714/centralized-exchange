"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SUPPORTED_PAIRS } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();

  const mockPrices = {
    "BTC/USDT": { price: "$43,250.00", change: "+2.45%", isUp: true },
    "ETH/USDT": { price: "$2,580.50", change: "-1.23%", isUp: false },
    "SOL/USDT": { price: "$98.75", change: "+5.67%", isUp: true },
    "AVAX/USDT": { price: "$36.20", change: "+3.21%", isUp: true },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Trading Dashboard
          </h2>
          <p className="text-slate-400">
            Monitor and trade your favorite cryptocurrency pairs
          </p>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Supported Markets
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SUPPORTED_PAIRS.map((market) => {
            const priceData = mockPrices[market as keyof typeof mockPrices] || {
              price: "$0.00",
              change: "0.00%",
              isUp: true,
            };

            return (
              <Card
                key={market}
                className="bg-slate-900/50 border-slate-800/50 backdrop-blur-sm hover:bg-slate-800/50 transition-all duration-200 cursor-pointer group"
                onClick={() => router.push(`/trade/${market}`)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {market}
                    </h4>
                    {priceData.isUp ? (
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Price</span>
                      <span className="text-white font-medium">
                        {priceData.price}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">24h Change</span>
                      <span
                        className={`font-medium ${priceData.isUp ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {priceData.change}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/trade/${market}`);
                    }}
                  >
                    Trade Now
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
