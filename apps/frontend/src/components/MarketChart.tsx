"use client";

import { ChartInterval, INTERVALS } from "@/types/chart";
import { Activity } from "lucide-react";
import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";

interface MarketChartProps {
  chartInterval: ChartInterval;
  setChartInterval: (interval: ChartInterval) => void;
}

export default function MarketChart({
  chartInterval,
  setChartInterval,
}: MarketChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
    if (!chartRef.current) {
       console.log("chartRef is null");
      return;
    }

    const chart = createChart(chartRef.current, {
      height: 500,
      layout: {
        background: { color: "#0f172a" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candlestickSeries.setData([
      {
        close: 100,
        high: 161,
        low: 60,
        open: 80,
        time: "2024-01-01",
      },
      {
        close: 80,
        high: 141,
        low: 60,
        open: 120,
        time: "2024-01-02",
      },
      {
        close: 120,
        high: 161,
        low: 60,
        open: 100,
        time: "2024-01-03",
      },
      {
        close: 140,
        high: 161,
        low: 60,
        open: 120,
        time: "2024-01-04",
      },
      {
        close: 160,
        high: 161,
        low: 60,
        open: 120,
        time: "2024-01-05",
      },
      {
        close: 200,
        high: 261,
        low: 120,
        open: 160,
        time: "2024-01-06",
      },
      {
        close : 220,
        high : 261,
        low : 160,
        open : 200,
        time : "2024-01-07",
      }
    ]);

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
    };
  }, []);

  return (
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
          className="w-full h-[500px]"
        />
      </div>
    </div>
  );
}
