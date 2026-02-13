import Decimal from "decimal.js";
import { Button } from "./ui/button";
import { IOrderBookOrder } from "@/types/orderbook";
import { IMarketData } from "@/types/market";

interface OrderBookPanelProps {
  orderBookTab: "ORDER_BOOK" | "TRADES";
  setOrderBookTab: (tab: "ORDER_BOOK" | "TRADES") => void;
  baseAsset: string;
  quoteAsset: string;
  lastPrice: string;
  asks: IOrderBookOrder[];
  bids: IOrderBookOrder[];
  recentTrades: any[];
  marketData: IMarketData;
  maxDepth: number;
  spread: string;
  spreadPercent: string;
  handlePriceClick: (price: Decimal) => void;
}

export default function OrderBookPanel({
  orderBookTab,
  setOrderBookTab,
  baseAsset,
  quoteAsset,
  lastPrice,
  asks,
  bids,
  recentTrades,
  marketData,
  maxDepth,
  spread,
  spreadPercent,
  handlePriceClick,
}: OrderBookPanelProps) {
  return (
    <div className="h-full bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      <div className="p-4 border-b flex items-center justify-start border-slate-800 bg-slate-900/50">
        <Button
          disabled={orderBookTab === "ORDER_BOOK"}
          onClick={() => setOrderBookTab("ORDER_BOOK")}
          className={`mr-2 hover:bg-slate-800/20 cursor-pointer ${orderBookTab === "ORDER_BOOK" ? "bg-slate-800/20" : ""}`}
        >
          <h2 className="text-md font-semibold text-white flex items-center gap-2">
            Order Book
          </h2>
        </Button>
        <Button
          disabled={orderBookTab === "TRADES"}
          onClick={() => setOrderBookTab("TRADES")}
          className={`mr-2 hover:bg-slate-800/20 cursor-pointer ${orderBookTab === "TRADES" ? "bg-slate-800/20" : ""}`}
        >
          <h2 className="text-md font-semibold text-white flex items-center gap-2">
            Trades
          </h2>
        </Button>
      </div>

      {orderBookTab === "ORDER_BOOK" ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800">
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 font-medium">
              <span>Price ({quoteAsset})</span>
              <span className="text-right">Size ({baseAsset})</span>
              <span className="text-right">Total</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div className="px-4 py-2">
              {asks
                .slice(0, 10)
                .reverse()
                .map((ask, index) => {
                  const depthPercent = (ask.total.toNumber() / maxDepth) * 100;
                  return (
                    <div
                      key={`ask-${index}`}
                      className="relative grid grid-cols-3 gap-2 text-sm py-1 hover:bg-red-500/10 cursor-pointer rounded transition-colors group"
                      onClick={() => handlePriceClick(ask.price)}
                    >
                      <div
                        className="absolute right-0 top-0 bottom-0 bg-red-500/10 transition-all group-hover:bg-red-500/15"
                        style={{ width: `${depthPercent}%` }}
                      />
                      <span className="text-red-400 font-mono relative z-10">
                        {ask.price.toFixed(2)}
                      </span>
                      <span className="text-slate-300 font-mono text-right relative z-10">
                        {ask.quantity.toFixed(4)}
                      </span>
                      <span className="text-slate-500 font-mono text-right text-xs relative z-10">
                        {ask.total.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
            </div>

            <div className="px-4 py-3 border-y border-slate-800 bg-slate-900/30 sticky top-0 z-10">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400 mb-1">
                  ${lastPrice}
                </div>
                <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                  <span>Spread: ${spread}</span>
                  <span>({spreadPercent}%)</span>
                </div>
              </div>
            </div>

            <div className="px-4 py-2">
              {bids.slice(0, 10).map((bid, index) => {
                const depthPercent = (bid.total.toNumber() / maxDepth) * 100;
                return (
                  <div
                    key={`bid-${index}`}
                    className="relative grid grid-cols-3 gap-2 text-sm py-1 hover:bg-emerald-500/10 cursor-pointer rounded transition-colors group"
                    onClick={() => handlePriceClick(bid.price)}
                  >
                    <div
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 transition-all group-hover:bg-emerald-500/15"
                      style={{ width: `${depthPercent}%` }}
                    />
                    <span className="text-emerald-400 font-mono relative z-10">
                      {bid.price.toFixed(2)}
                    </span>
                    <span className="text-slate-300 font-mono text-right relative z-10">
                      {bid.quantity.toFixed(4)}
                    </span>
                    <span className="text-slate-500 font-mono text-right text-xs relative z-10">
                      {bid.total.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800">
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 font-medium">
              <span>Price ({quoteAsset})</span>
              <span className="text-right">Size ({baseAsset})</span>
              <span className="text-right">Time</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div className="px-4 py-2 space-y-0.5">
              {recentTrades && recentTrades.length > 0 ? (
                recentTrades.map((trade, index) => {
                  const prevPrice = recentTrades[index - 1]?.price;
                  const price = Number(trade.price);

                  const priceColor =
                    prevPrice == null
                      ? "text-slate-300"
                      : price > Number(prevPrice)
                        ? "text-emerald-400"
                        : price < Number(prevPrice)
                          ? "text-red-400"
                          : "text-slate-300";

                  return (
                    <div
                      key={`${trade.buyOrderId}-${trade.sellOrderId}`}
                      className="grid grid-cols-3 gap-2 text-sm py-1 rounded hover:bg-slate-800/40 transition-colors"
                    >
                      <span className={`font-mono ${priceColor}`}>
                        {price.toFixed(2)}
                      </span>

                      <span className="font-mono text-slate-300 text-right">
                        {Number(trade.quantity).toFixed(4)}
                      </span>

                      <span className="font-mono text-slate-500 text-right text-xs">
                        {new Date(trade.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex mt-4 items-center justify-center">
                  <p className="text-slate-400">No trades available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
