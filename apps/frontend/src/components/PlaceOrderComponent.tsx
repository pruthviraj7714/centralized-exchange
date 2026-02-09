import { IUserBalancesData } from "@/types/wallet";
import Decimal from "decimal.js";
import { Wallet } from "lucide-react";

interface PlaceOrderComponentProps {
  orderType: "LIMIT" | "MARKET";
  activeTab: "BUY" | "SELL";
  setOrderType: (orderType: "LIMIT" | "MARKET") => void;
  setActiveTab: (activeTab: "BUY" | "SELL") => void;
  userBalancesData: IUserBalancesData;
  userBalancesLoading: boolean;
  handlePlaceOrder: () => void;
  handlePlaceOrderDisabled: () => boolean;
  handleSetQuantity: (percent: string) => void;
  totalValue: string;
  quoteAsset: string;
  baseAsset: string;
  price: Decimal;
  spendAmount: Decimal;
  quantity: Decimal;
  setSpendAmount: (spendAmount: Decimal) => void;
  setQuantity: (quantity: Decimal) => void;
  setPrice: (price: Decimal) => void;
}

export default function PlaceOrderComponent({
  orderType,
  activeTab,
  setOrderType,
  setActiveTab,
  userBalancesData,
  userBalancesLoading,
  handlePlaceOrder,
  handlePlaceOrderDisabled,
  handleSetQuantity,
  totalValue,
  quoteAsset,
  baseAsset,
  price,
  spendAmount,
  quantity,
  setSpendAmount,
  setQuantity,
  setPrice,
}: PlaceOrderComponentProps) {
  return (
    <div className="h-full bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex gap-2">
          <button
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded transition-all ${
              orderType === "LIMIT"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            onClick={() => setOrderType("LIMIT")}
          >
            Limit
          </button>
          <button
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded transition-all ${
              orderType === "MARKET"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            onClick={() => setOrderType("MARKET")}
          >
            Market
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/50 rounded-lg">
          <button
            className={`py-2 text-sm font-semibold rounded transition-all ${
              activeTab === "BUY"
                ? "bg-emerald-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => setActiveTab("BUY")}
          >
            Buy
          </button>
          <button
            className={`py-2 text-sm font-semibold rounded transition-all ${
              activeTab === "SELL"
                ? "bg-red-600 text-white shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
            onClick={() => setActiveTab("SELL")}
          >
            Sell
          </button>
        </div>

        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Wallet className="w-3 h-3" />
              Available
            </span>
            <span className="text-sm font-semibold text-white">
              {userBalancesLoading ? (
                <div className="w-20 h-5 bg-slate-800/50 rounded animate-pulse"></div>
              ) : activeTab === "BUY" ? (
                userBalancesData?.quoteAssetWallet.available.toString()
              ) : (
                userBalancesData?.baseAssetWallet.available.toString()
              )}
            </span>
          </div>
        </div>

        {orderType === "LIMIT" && (
          <div className="space-y-2">
            <label className="text-sm text-slate-300 font-medium">
              Price ({quoteAsset})
            </label>
            <input
              type="number"
              value={price.toString()}
              onChange={(e) => setPrice(new Decimal(e.target.value))}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
          </div>
        )}

        {orderType === "MARKET" && activeTab === "BUY" && (
          <div className="space-y-2">
            <label className="text-sm text-slate-300 font-medium">
              Spend Amount ({quoteAsset})
            </label>
            <input
              type="text"
              value={spendAmount.toString()}
              onChange={(e) => setSpendAmount(new Decimal(e.target.value))}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
          </div>
        )}

        {((orderType === "MARKET" && activeTab === "SELL") ||
          orderType === "LIMIT") && (
          <div className="space-y-2">
            <label className="text-sm text-slate-300 font-medium">
              Quantity ({baseAsset})
            </label>
            <input
              type="text"
              value={new Decimal(quantity).toString()}
              onChange={(e) => setQuantity(new Decimal(e.target.value))}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {["25%", "50%", "75%", "max"].map((percent) => (
            <button
              key={percent}
              className="py-2 text-xs font-medium text-slate-400 bg-slate-900/50 border border-slate-700 rounded hover:border-emerald-500 hover:text-emerald-400 transition-all"
              onClick={() => handleSetQuantity(percent)}
            >
              {percent}
            </button>
          ))}
        </div>

        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Value</span>
            <span className="text-white font-bold">${totalValue}</span>
          </div>
          {orderType === "LIMIT" && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Est. Fee (0.1%)</span>
              <span className="text-slate-400">
                ${(parseFloat(totalValue) * 0.001).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={handlePlaceOrderDisabled()}
          className={`w-full py-4 text-base font-bold rounded-lg transition-all shadow-lg ${
            handlePlaceOrderDisabled()
              ? "bg-slate-600 cursor-not-allowed"
              : activeTab === "BUY"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/30"
                : "bg-red-600 hover:bg-red-500 text-white shadow-red-500/30"
          }`}
        >
          {activeTab === "BUY" ? "Place Buy Order" : "Place Sell Order"}
        </button>
      </div>
    </div>
  );
}
