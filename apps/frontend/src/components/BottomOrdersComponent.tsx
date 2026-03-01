import { BottomTab } from "@/types/order";
import { IOrder } from "@/types/order";
import { ITrade } from "@/types/trade";
import { Decimal } from "decimal.js";

const sideColor = {
  BUY: "text-green-500",
  SELL: "text-red-500",
};

const statusColor: Record<string, string> = {
  OPEN: "text-yellow-400",
  FILLED: "text-green-500",
  CANCELLED: "text-red-500",
  PARTIALLY_FILLED: "text-blue-400",
  EXPIRED: "text-gray-400",
};

interface BottomOrdersComponentProps {
  bottomTab: BottomTab;
  setBottomTab: (tab: BottomTab) => void;
  userOrdersData: IOrder[];
  userOrdersHistoryData: IOrder[];
  userTradesData: ITrade[];
  cancelOrderMutation: (orderId: string) => void;
  baseAsset: string;
  quoteAsset: string;
}

const BottomOrdersComponent = ({
  bottomTab,
  setBottomTab,
  userOrdersData,
  userOrdersHistoryData,
  userTradesData,
  cancelOrderMutation,
  baseAsset,
  quoteAsset,
}: BottomOrdersComponentProps) => {
  const isMarketBuy = (order: IOrder) =>
    order.type === "MARKET" && order.side === "BUY";

  // How much base was acquired — only meaningful for LIMIT and market SELL
  const getFilledBase = (order: IOrder): Decimal => {
    if (isMarketBuy(order)) {
      // base filled isn't tracked directly on the order — derive from quoteSpent / avgPrice
      // if no trades yet, return 0
      const spent = new Decimal(order.quoteSpent ?? 0);
      const avg = getAvgPrice(order);
      return avg.gt(0) ? spent.div(avg) : new Decimal(0);
    }
    return new Decimal(order.originalQuantity).minus(order.remainingQuantity);
  };

  // How much quote was spent — meaningful for all types
  const getFilledQuote = (order: IOrder): Decimal => {
    if (order.quoteSpent != null && new Decimal(order.quoteSpent).gt(0)) {
      return new Decimal(order.quoteSpent);
    }
    // fallback for limit orders before quoteSpent is populated
    if (order.price) {
      return getFilledBase(order).mul(new Decimal(order.price));
    }
    return new Decimal(0);
  };

  // Average fill price
  const getAvgPrice = (order: IOrder): Decimal => {
    if (order.price && new Decimal(order.price).gt(0)) {
      // limit order — use actual price (quoteSpent / filledBase is more accurate if available)
      const filledBase = new Decimal(order.originalQuantity).minus(
        order.remainingQuantity,
      );
      const filledQuote = new Decimal(order.quoteSpent ?? 0);
      return filledBase.gt(0) && filledQuote.gt(0)
        ? filledQuote.div(filledBase)
        : new Decimal(order.price);
    }
    // market order — derive from quoteSpent and remainingQuantity isn't useful
    // we need filledBase from outside, so return 0 for now (avg price col not shown for market)
    return new Decimal(0);
  };

  return (
    <div className="bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden">
      <div className="flex gap-2 p-3 border-b border-slate-800 bg-slate-900/50">
        {["OPEN_ORDERS", "ORDER_HISTORY", "TRADE_HISTORY"].map((tab) => (
          <button
            key={tab}
            onClick={() => setBottomTab(tab as BottomTab)}
            className={`px-4 py-2 text-sm font-semibold rounded transition-all ${
              bottomTab === tab
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="h-[260px] overflow-y-auto">
        {bottomTab === "OPEN_ORDERS" && (
          <div className="h-[260px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0f172a] text-gray-400">
                <tr>
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Side</th>
                  <th className="text-right p-2">Price ({quoteAsset})</th>
                  <th className="text-right p-2">
                    {/* Label changes based on order type — handled per-row below */}
                    Amount
                  </th>
                  <th className="text-right p-2">Remaining</th>
                  <th className="text-center p-2">Type</th>
                  <th className="text-center p-2">Action</th>
                </tr>
              </thead>

              <tbody>
                {userOrdersData?.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-800 hover:bg-white/5"
                  >
                    <td className="p-2 text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </td>

                    <td className={`p-2 font-medium ${sideColor[order.side]}`}>
                      {order.side}
                    </td>

                    <td className="p-2 text-right">
                      {order.type === "LIMIT" ? order.price : "MARKET"}
                    </td>

                    {/* Amount: LIMIT = base qty, Market BUY = quoteAmount, Market SELL = base qty */}
                    <td className="p-2 text-right">
                      {order.type === "LIMIT" ? (
                        <>
                          {new Decimal(order.originalQuantity).toFixed(4)}{" "}
                          <span className="text-gray-500">{baseAsset}</span>
                        </>
                      ) : isMarketBuy(order) ? (
                        <>
                          {new Decimal(order.quoteAmount ?? 0).toFixed(2)}{" "}
                          <span className="text-gray-500">{quoteAsset}</span>
                        </>
                      ) : (
                        <>
                          {new Decimal(order.originalQuantity).toFixed(4)}{" "}
                          <span className="text-gray-500">{baseAsset}</span>
                        </>
                      )}
                    </td>

                    {/* Remaining: LIMIT = base qty, Market BUY = quoteRemaining, Market SELL = base qty */}
                    <td className="p-2 text-right">
                      {order.type === "LIMIT" ? (
                        <>
                          {new Decimal(order.remainingQuantity).toFixed(4)}{" "}
                          <span className="text-gray-500">{baseAsset}</span>
                        </>
                      ) : isMarketBuy(order) ? (
                        <>
                          {new Decimal(order.quoteRemaining ?? 0).toFixed(2)}{" "}
                          <span className="text-gray-500">{quoteAsset}</span>
                        </>
                      ) : (
                        <>
                          {new Decimal(order.remainingQuantity).toFixed(4)}{" "}
                          <span className="text-gray-500">{baseAsset}</span>
                        </>
                      )}
                    </td>

                    <td className="p-2 text-center text-gray-300">
                      {order.type}
                    </td>

                    <td className="p-2 text-center">
                      <button
                        onClick={() => cancelOrderMutation(order.id)}
                        className="text-xs px-3 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}

                {userOrdersData?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-500">
                      No open orders
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {bottomTab === "ORDER_HISTORY" && (
          <div className="h-[260px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0f172a] text-gray-400">
                <tr>
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Side</th>
                  <th className="text-center p-2">Price ({quoteAsset})</th>
                  <th className="text-right p-2">Total ({quoteAsset})</th>
                  <th className="text-right p-2">Filled</th>
                  <th className="text-center p-2">Type</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>

              <tbody>
                {userOrdersHistoryData?.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-800 hover:bg-white/5"
                  >
                    <td className="p-2 text-gray-400">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>

                    <td className={`p-2 font-medium ${sideColor[order.side]}`}>
                      {order.side}
                    </td>

                    <td className="p-2 text-center">
                      {order.type === "LIMIT"
                        ? new Decimal(order.price ?? 0).toFixed(2)
                        : getAvgPrice(order).gt(0)
                          ? getAvgPrice(order).toFixed(2)
                          : "—"}
                    </td>

                    {/* Total: LIMIT = originalQty in base, Market BUY = quoteAmount, Market SELL = base qty */}
                    <td className="p-2 text-right">
                      {order.type === "LIMIT" ? (
                        <>
                          {new Decimal(order.originalQuantity).toFixed(4)}{" "}
                          <span className="text-gray-500">{baseAsset}</span>
                        </>
                      ) : isMarketBuy(order) ? (
                        <>
                          {new Decimal(order.quoteAmount ?? 0).toFixed(2)}{" "}
                          <span className="text-gray-500">{quoteAsset}</span>
                        </>
                      ) : (
                        <>
                          {new Decimal(order.originalQuantity).toFixed(4)}{" "}
                          <span className="text-gray-500">{baseAsset}</span>
                        </>
                      )}
                    </td>

                    {/* Filled: LIMIT = filled base, Market BUY = quoteSpent, Market SELL = filled base */}
                    <td className="p-2 text-right">
                      {order.type === "LIMIT" ? (
                        <>
                          {getFilledBase(order).toFixed(4)}{" "}
                          <span className="text-gray-500">{baseAsset}</span>
                        </>
                      ) : isMarketBuy(order) ? (
                        <>
                          {getFilledQuote(order).toFixed(2)}{" "}
                          <span className="text-gray-500">{quoteAsset}</span>
                        </>
                      ) : (
                        <>
                          {getFilledBase(order).toFixed(4)}{" "}
                          <span className="text-gray-500">{baseAsset}</span>
                        </>
                      )}
                    </td>

                    <td className="p-2 text-center text-gray-300">
                      {order.type}
                    </td>

                    <td
                      className={`p-2 text-center font-medium ${statusColor[order.status] ?? "text-gray-400"}`}
                    >
                      {order.status}
                    </td>
                  </tr>
                ))}

                {userOrdersHistoryData?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-500">
                      No order history
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {bottomTab === "TRADE_HISTORY" && (
          <div className="h-[260px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0f172a] text-gray-400">
                <tr>
                  <th className="text-left p-2">Time</th>
                  <th className="text-center p-2">Price ({quoteAsset})</th>
                  <th className="text-center p-2">Qty ({baseAsset})</th>
                  <th className="text-right p-2">Total ({quoteAsset})</th>
                </tr>
              </thead>

              <tbody>
                {userTradesData?.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-b border-gray-800 hover:bg-white/5"
                  >
                    <td className="p-2 text-gray-400">
                      {new Date(trade.executedAt).toLocaleString()}
                    </td>

                    <td className="p-2 text-center font-medium">
                      {new Decimal(trade.price).toFixed(2)}
                    </td>

                    <td className="p-2 text-center">
                      {new Decimal(trade.quantity).toFixed(4)}
                    </td>

                    {/* ✅ Added total column — useful for market orders to see actual value */}
                    <td className="p-2 text-right text-gray-300">
                      {new Decimal(trade.price)
                        .mul(new Decimal(trade.quantity))
                        .toFixed(2)}
                    </td>
                  </tr>
                ))}

                {userTradesData?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-gray-500">
                      No trade history
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomOrdersComponent;
