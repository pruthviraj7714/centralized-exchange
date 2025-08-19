"use client";

import useSocket from "@/hooks/useSocket";
import { useEffect, useState } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import axios from "axios";
import { BACKEND_URL } from "@/lib/config";
import { Button } from "./ui/button";

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
export default function TradesPageComponet({ ticker }: { ticker: string }) {
  const { isConnected, socket } = useSocket(ticker);
  const [currentTab, setCurrentTab] = useState<"BUY" | "SELL">("BUY");
  const [bids, setBids] = useState<IOrderResponse[]>([]);
  const [asks, setAsks] = useState<IOrderResponse[]>([]);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const authToken = localStorage.getItem('user-auth');

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
      console.log(data);
      const payload = JSON.parse(data.toString());

      switch (payload.type) {
        case "ORDERBOOK_SNAPSHOT": {
          setBids(payload.data.bids);
          setAsks(payload.data.asks);
          setLastPrice(payload.data.lastPrice);
        }
      }
    };
  }, [socket, isConnected]);

  const handlePlaceOrder = async (side: "BUY" | "SELL") => {
    try {
      const response = await axios.post(`${BACKEND_URL}/orders`, {
        side,
        quantity,
        price,
        type: "LIMIT", //limit for now
        pair: ticker,
      }, {
        headers : {
            Authorization : authToken
        }
      });
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response.data.message ?? error.message);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <div className="grid grid-cols-2 gap-3 mt-4">
        <span
          className="px-4 py-2 bg-black text-white cursor-pointer"
          onClick={() => setCurrentTab("BUY")}
        >
          Buy
        </span>
        <span
          className="px-4 py-2 bg-black text-white cursor-pointer"
          onClick={() => setCurrentTab("SELL")}
        >
          Sell
        </span>
      </div>
      <div>
        {currentTab === "BUY" ? (
          <div className="flex flex-col items-center">
            <div className="flex flex-col my-2">
              <Label>Price</Label>
              <Input onChange={(e) => setPrice(e.target.valueAsNumber)} type="Number" placeholder="Enter bid amount" />
            </div>
            <div className="flex flex-col my-2">
              <Label>Quantity</Label>
              <Input onChange={(e) => setQuantity(e.target.valueAsNumber)} type="Number" placeholder="Enter bid qty" />
            </div>
            <Button  onClick={() => handlePlaceOrder("BUY")}>Submit</Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex flex-col my-2">
              <Label>Price</Label>
              <Input onChange={(e) => setPrice(e.target.valueAsNumber)} type="Number" placeholder="Enter ask amount" />
            </div>
            <div className="flex flex-col my-2">
              <Label>Quantity</Label>
              <Input onChange={(e) => setQuantity(e.target.valueAsNumber)} type="Number" placeholder="Enter ask qty" />
            </div>
            <Button onClick={() => handlePlaceOrder("SELL")}>Submit</Button>
          </div>
        )}
      </div>
      <div className="flex flex-col items-center">
        <Table className="bg-red-400 text-white">
          <TableHeader>
            <TableRow>
              <TableHead>Qty</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {asks &&
              asks.length > 0 &&
              [...asks].reverse().map((ask) => (
                <TableRow key={ask.requestId}>
                  <TableCell>{ask.quantity}</TableCell>
                  <TableCell>{ask.price}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <Table className="bg-green-400 text-white">
          <TableHeader>
            <TableRow>
              <TableHead>Qty</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bids &&
              bids.length > 0 &&
              bids.map((bid) => (
                <TableRow key={bid.requestId}>
                  <TableCell>{bid.quantity}</TableCell>
                  <TableCell>{bid.price}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
