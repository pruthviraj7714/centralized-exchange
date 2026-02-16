import { BottomTab } from "@/types/order";
import { IOrder } from "@/types/order";
import { ITrade } from "@/types/trade";

const sideColor = {
  BUY: "text-green-500",
  SELL: "text-red-500",
};

const statusColor = {
  OPEN: "text-yellow-400",
  FILLED: "text-green-500",
  CANCELLED: "text-red-500",
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
                  <th className="text-right p-2">Qty ({baseAsset})</th>
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
                      {order.price ? order.price : "Market"}
                    </td>

                    <td className="p-2 text-right">{order.originalQuantity}</td>

                    <td className="p-2 text-right">
                      {order.remainingQuantity}
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
                  <th className="text-right p-2">Price ({quoteAsset})</th>
                  <th className="text-right p-2">Qty ({baseAsset})</th>
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

                    <td className="p-2 text-right">
                      {order.price ? order.price : "Market"}
                    </td>

                    <td className="p-2 text-right">{order.originalQuantity}</td>

                    <td className="p-2 text-center text-gray-300">
                      {order.type}
                    </td>

                    <td
                      className={`p-2 text-center font-medium ${statusColor[order.status]}`}
                    >
                      {order.status}
                    </td>
                  </tr>
                ))}

                {userOrdersHistoryData?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
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

                    <td className={`p-2 text-center font-medium`}>
                      {trade.price}
                    </td>

                    <td className="p-2 text-center">{trade.quantity}</td>
                  </tr>
                ))}

                {userTradesData?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500">
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
