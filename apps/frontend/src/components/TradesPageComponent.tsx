"use client";

import useSocket from "@/hooks/useSocket";
import { useEffect, useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { Button } from "./ui/button";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

type ORDER_STATUS = "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";
interface IOrderResponse {
  id?: string;
  requestId: string;
  userId: string;
  side: "BUY" | "SELL";
  pair: string;
  price: number;
  quantity: number;
  filledQuantity: number;
  createdAt: number;
  orderId?: string;
  updatedAt: number;
  streamId: string;
  event?: "CREATE_ORDER" | "CANCEL_ORDER";
  type: "LIMIT" | "MARKET";
  status: ORDER_STATUS;
}

const transformOrderbook = (
  orders: IOrderResponse[]
): {
  price: number;
  size: number;
  total: number;
  requestId: string;
}[] => {
  let orderbook: {
    price: number;
    size: number;
    total: number;
    requestId: string;
  }[] = [];
  let currTotal = 0;
  let lastOrderIndex = 0;
  for (let i = 0; i < orders.length; i++) {
    if (
      orderbook.length > 0 &&
      orders[lastOrderIndex].price === orders[i].price
    ) {
      orderbook[lastOrderIndex].size += orders[i].quantity;
      orderbook[lastOrderIndex].total += orders[i].quantity;
    } else {
      orderbook.push({
        price: orders[i].price,
        requestId: orders[i].requestId,
        size: orders[i].quantity,
        total: orders[i].quantity + currTotal,
      });
    }
    lastOrderIndex = orderbook.length - 1;
    currTotal += orders[i].quantity;
  }

  return orderbook;
};

export default function TradesPageComponent({ ticker }: { ticker: string }) {
  const { isConnected, socket } = useSocket(ticker);
  const [currentTab, setCurrentTab] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT");
  const [bids, setBids] = useState<IOrderResponse[]>([]);
  const [asks, setAsks] = useState<IOrderResponse[]>([]);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const authToken = localStorage.getItem("user-auth");

  useEffect(() => {
    if (socket && isConnected) {
      socket.send(
        JSON.stringify({
          type: "GET_ORDERBOOK",
        })
      );
    }
  }, [socket, isConnected, ticker]);

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = ({ data }) => {
      const payload = JSON.parse(data.toString());

      switch (payload.type) {
        case "ORDERBOOK_SNAPSHOT": {
          setBids(payload.bids);
          setAsks(payload.asks);
          setLastPrice(payload.lastPrice);
          break;
        }
        case "ORDERBOOK_UPDATE": {
          setBids(payload.bids);
          setAsks(payload.asks);
          setLastPrice(payload.lastPrice);
          break;
        }
      }
    };
  }, [socket, isConnected]);

  const handlePlaceOrder = async (side: "BUY" | "SELL") => {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/orders`,
        {
          side,
          quantity,
          price,
          type: orderType,
          pair: ticker,
        },
        {
          headers: {
            Authorization: authToken,
          },
        }
      );
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response.data.message ?? error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {ticker}
            </h1>
            {lastPrice && (
              <div className="flex items-center space-x-2 bg-slate-800/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700">
                <span className="text-2xl font-bold text-emerald-400">
                  ${lastPrice.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="lg:col-span-1">
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-red-400" />
                  Place Order
                </h2>

                <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-900/50 rounded-lg">
                  <button
                    className={`px-4 py-3 rounded-md font-medium transition-all duration-200 ${
                      currentTab === "BUY"
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                    onClick={() => setCurrentTab("BUY")}
                  >
                    <TrendingUp className="w-4 h-4 inline mr-2" />
                    Buy
                  </button>
                  <button
                    className={`px-4 py-3 rounded-md font-medium transition-all duration-200 ${
                      currentTab === "SELL"
                        ? "bg-red-600 text-white shadow-lg shadow-red-600/25"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                    onClick={() => setCurrentTab("SELL")}
                  >
                    <TrendingDown className="w-4 h-4 inline mr-2" />
                    Sell
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-900/50 rounded-lg">
                  <button
                    className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                      orderType === "MARKET"
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                    onClick={() => setOrderType("MARKET")}
                  >
                    Market
                  </button>
                  <button
                    className={`px-4 py-2 rounded-md font-medium transition-all duration-200 ${
                      orderType === "LIMIT"
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                    onClick={() => setOrderType("LIMIT")}
                  >
                    Limit
                  </button>
                </div>

                <div className="space-y-4">
                  {orderType === "LIMIT" && (
                    <div>
                      <Label className="text-slate-300 font-medium mb-2 block">
                        Price (USD)
                      </Label>
                      <Input
                        onChange={(e) => setPrice(e.target.valueAsNumber)}
                        type="number"
                        placeholder={
                          currentTab === "BUY"
                            ? "Enter bid price"
                            : "Enter ask price"
                        }
                        className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-slate-300 font-medium mb-2 block">
                      Quantity
                    </Label>
                    <Input
                      onChange={(e) => setQuantity(e.target.valueAsNumber)}
                      type="number"
                      placeholder="Enter quantity"
                      className="bg-slate-900/50 border-slate-600 text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  </div>

                  <Button
                    onClick={() => handlePlaceOrder(currentTab)}
                    className={`w-full py-3 font-semibold transition-all duration-200 ${
                      currentTab === "BUY"
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/25"
                        : "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/25"
                    }`}
                  >
                    {currentTab === "BUY"
                      ? `Place ${orderType} Buy Order`
                      : `Place ${orderType} Sell Order`}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
              <h2 className="text-xl font-semibold mb-6">Order Book</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-red-400 font-medium mb-3 flex items-center">
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Asks (Sell Orders)
                  </h3>
                  <div className="bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-slate-800/50">
                          <TableHead className="text-slate-300 font-medium">
                            Price (USD)
                          </TableHead>
                          <TableHead className="text-slate-300 font-medium">
                            Size ({ticker.split("-")[0]})
                          </TableHead>
                          <TableHead className="text-slate-300 font-medium">
                            Total ({ticker.split("-")[0]})
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {asks && asks.length > 0 ? (
                          [...transformOrderbook(asks)].reverse().map((ask) => (
                            <TableRow
                              key={ask.requestId}
                              className="border-slate-700 hover:bg-red-900/10 transition-colors"
                            >
                              <TableCell className="text-red-400 font-medium">
                                ${ask.price.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-slate-200">
                                {ask.size}
                              </TableCell>
                              <TableCell className="text-slate-200">
                                {ask.total}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center text-slate-400 py-8"
                            >
                              No ask orders available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h3 className="text-emerald-400 font-medium mb-3 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Bids (Buy Orders)
                  </h3>
                  <div className="bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700 hover:bg-slate-800/50">
                          <TableHead className="text-slate-300 font-medium">
                            Price (USD)
                          </TableHead>
                          <TableHead className="text-slate-300 font-medium">
                            Size ({ticker.split("-")[0]})
                          </TableHead>
                          <TableHead className="text-slate-300 font-medium">
                            Total ({ticker.split("-")[0]})
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bids && bids.length > 0 ? (
                          transformOrderbook(bids).map((bid) => (
                            <TableRow
                              key={bid.requestId}
                              className="border-slate-700 hover:bg-emerald-900/10 transition-colors"
                            >
                              <TableCell className="text-emerald-400 font-medium">
                                ${bid.price.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-slate-200">
                                {bid.size}
                              </TableCell>
                              <TableCell className="text-slate-200">
                                {bid.total}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center text-slate-400 py-8"
                            >
                              No bid orders available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
