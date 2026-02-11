"use client";

import { ChartInterval, ICandle, INTERVALS } from "@/types/chart";
import { Activity } from "lucide-react";
import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import Decimal from "decimal.js";

interface MarketChartProps {
  chartInterval: ChartInterval;
  setChartInterval: (interval: ChartInterval) => void;
  candles: ICandle[];
}

export default function MarketChart({
  chartInterval,
  setChartInterval,
  candles,
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

    const formatted = candles
  .map((candle) => ({
    //type error here number is not assignable to type Time fix this
    time: new Date(candle.openTime).toISOString().split("T")[0] as any, // seconds
    open: new Decimal(candle.open).toNumber(),
    high: new Decimal(candle.high).toNumber(),
    low: new Decimal(candle.low).toNumber(),
    close: new Decimal(candle.close).toNumber(),
  }))
  .sort((a, b) => a.time - b.time)
  .filter((candle, index, arr) =>
    index === 0 || candle.time !== arr[index - 1].time
  );

    candlestickSeries.setData(formatted);

    // candlestickSeries.setData(candles.map((candle : ICandle) => ({
    //    close : Decimal(candle.close).toNumber(),
    //    high : Decimal(candle.high).toNumber(),
    //    low : Decimal(candle.low).toNumber(),
    //    open : Decimal(candle.open).toNumber(),
    //    time : new Date(candle.openTime).toISOString().split("T")[0],
    // })));

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
    };
  }, [candles]);

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
