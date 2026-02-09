import { ChartInterval, INTERVALS } from "@/types/chart";
import { Activity } from "lucide-react";

interface MarketChartProps {
  chartInterval: ChartInterval;
  setChartInterval: (interval: ChartInterval) => void;
  chartRef: React.RefObject<HTMLDivElement | null>;
}

export default function MarketChart({
  chartInterval,
  setChartInterval,
  chartRef,
}: MarketChartProps) {
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
          className="w-full h-[500px] bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center"
        >
          <div className="text-center">
            <Activity className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Chart Loading...</p>
            <p className="text-slate-600 text-sm mt-2">
              TradingView integration goes here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
