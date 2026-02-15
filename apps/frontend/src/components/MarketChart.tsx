"use client";

import { ChartInterval, ICandle, INTERVALS } from "@/types/chart";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  CandlestickSeries,
} from "lightweight-charts";
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
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [priceChange, setPriceChange] = useState<{
    value: string;
    percentage: string;
    isPositive: boolean;
  } | null>(null);

  console.log(candles);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#0f172a" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "#64748b",
          width: 1,
          style: 2,
          labelBackgroundColor: "#334155",
        },
        horzLine: {
          color: "#64748b",
          width: 1,
          style: 2,
          labelBackgroundColor: "#334155",
        },
      },
      rightPriceScale: {
        borderColor: "#1e293b",
        textColor: "#94a3b8",
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
        secondsVisible: chartInterval === "1m",
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceFormat: {
        type: "price",
        precision: 6,
        minMove: 0.000001,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const { width, height } = chartContainerRef.current.getBoundingClientRect();
        chartRef.current.applyOptions({
          width: width,
          height: height,
        });
      }
    };

    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(chartContainerRef.current);

    handleResize();

    return () => {
      resizeObserverRef.current?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.applyOptions({
      timeScale: {
        timeVisible: true,
        secondsVisible: chartInterval === "1m" || chartInterval === "5m",
      },
    });
  }, [chartInterval]);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !candles.length) return;

    const formatted: CandlestickData<Time>[] = candles
      .map((candle) => {
        const timeValue: Time =
          chartInterval === "1d"
            ? (new Date(candle.openTime).toISOString().split("T")[0] as Time)
            : (Math.floor(candle.openTime / 1000) as Time);

        return {
          time: timeValue,
          open: new Decimal(candle.open).toNumber(),
          high: new Decimal(candle.high).toNumber(),
          low: new Decimal(candle.low).toNumber(),
          close: new Decimal(candle.close).toNumber(),
        };
      })
      .sort((a, b) => {
        if (typeof a.time === "number" && typeof b.time === "number") {
          return a.time - b.time;
        }
        return String(a.time).localeCompare(String(b.time));
      })
      .filter(
        (candle, index, arr) =>
          index === 0 || candle.time !== arr[index - 1].time,
      );

    if (formatted.length === 0) return;

    if (formatted.length >= 2) {
      const firstCandle = formatted[0];
      const lastCandle = formatted[formatted.length - 1];
      const change = lastCandle.close - firstCandle.open;
      const changePercent = (change / firstCandle.open) * 100;

      setPriceChange({
        value: change.toFixed(2),
        percentage: changePercent.toFixed(2),
        isPositive: change >= 0,
      });
    }

    candlestickSeriesRef.current.setData(formatted);

    if (chartRef.current) {
      const timeScale = chartRef.current.timeScale();
      const currentScrollPosition = timeScale.scrollPosition();
      
      if (currentScrollPosition === 0) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [candles, chartInterval]);

  return (
    <div className="h-full bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1">
            {INTERVALS.map((iv) => (
              <button
                key={iv}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  iv === chartInterval
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
                onClick={() => setChartInterval(iv)}
              >
                {iv}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {priceChange && (
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  priceChange.isPositive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {priceChange.isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>
                  {priceChange.isPositive ? "+" : ""}
                  {priceChange.value} ({priceChange.isPositive ? "+" : ""}
                  {priceChange.percentage}%)
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Chart</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        <div ref={chartContainerRef} className="absolute inset-0" />
      </div>
      <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/30">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>• Scroll to zoom</span>
            <span>• Drag to pan</span>
            <span>• Double-click to reset</span>
          </div>
          <div>{candles.length} candles</div>
        </div>
      </div>
    </div>
  );
}