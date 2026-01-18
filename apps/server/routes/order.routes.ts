import { Router, type Request, type Response } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import prisma from "@repo/db";
import { SUPPORTED_PAIRS } from "../utils/constants";
import redisClient from "@repo/redisclient";
import { MARKET_ORDER_BUFFER, MATCHING_ENGINE_STREAM, TRADING_API_SERVER_URL } from "../utils/config";

const orderRouter: Router = Router();

interface IOrder {
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  pair: string;
  type: "LIMIT" | "MARKET";
  createdAt: Date;
}

const splitOrders = (orders: IOrder[]) => {
  return {
    buyOrders: orders
      .filter((o) => o.side === "BUY")
      .sort((a, b) => b.price - a.price),
    sellOrders: orders
      .filter((o) => o.side === "SELL")
      .sort((a, b) => a.price - b.price),
  };
};


const proxyToTradingAPIServer = async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${TRADING_API_SERVER_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${req.headers.authorization?.split(" ")[1]}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json(data);
      return;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Trading API Server Error: " + error
    });
  }
}
orderRouter.post("/", proxyToTradingAPIServer)

// orderRouter.post("/", authMiddleware, async (req: Request, res: Response) => {
//   try {
//     const userId = req.userId!;
//     let bestPrice;
//     let bufferedAmount;

//     const { success, data } = OrderSchema.safeParse(req.body);

//     if (!success) {
//       res.status(400).json({
//         message: "Invalid Inputs",
//       });
//       return;
//     }

//     const { side, quantity, price, pair, type } = data;

//     if (pair && !SUPPORTED_PAIRS.includes(pair)) {
//       res.status(400).json({
//         message: "Invalid Trading pair",
//       });
//       return;
//     }

//     if (type === "LIMIT" && (price <= 0 || quantity <= 0)) {
//       res.status(400).json({
//         message: "Please Check Amount or Quantity it should be greater than 0",
//       });
//       return;
//     }

//     if (type === "MARKET" && quantity <= 0) {
//       res.status(400).json({
//         message: "Quantity should be greater than 0",
//       });
//       return;
//     }

//     const requestId = crypto.randomUUID();

//     const wallets = await prisma.wallet.findMany({
//       where: { userId },
//     });

//     const [baseAsset, quoteAsset] = pair?.split("-")!;

//     if (!baseAsset || !quoteAsset) {
//       res.status(400).json({ message: "invalid ticker" });
//       return;
//     }

//     const baseWallet = wallets.find((w) => w.asset === baseAsset);
//     const quoteWallet = wallets.find((w) => w.asset === quoteAsset);

//     if (!quoteWallet) {
//       res.status(400).json({ message: "no quote asset wallet found" });
//       return;
//     }

//     if (!baseWallet) {
//       res.status(400).json({ message: "no base asset wallet found" });
//       return;
//     }

//     if (side === "BUY" && type === "LIMIT") {
//       if (price <= 0 || quantity <= 0) {
//         res
//           .status(400)
//           .json({ message: "qty & price should be greater than 0" });
//         return;
//       }

//       const amount = price * quantity;

//       if (quoteWallet.available < amount) {
//         res.status(400).json({ message: "insuffcient funds!" });
//         return;
//       }
//       await prisma.wallet.update({
//         where: {
//           id: quoteWallet?.id,
//         },
//         data: {
//           available: {
//             decrement: amount,
//           },
//           locked: {
//             increment: amount,
//           },
//         },
//       });
//     }

//     if (side === "BUY" && type === "MARKET") {
//       if (quantity <= 0) {
//         res.status(400).json({ message: "insuffcient funds!" });
//         return;
//       }

//       bestPrice = await redisClient.get(`Best-Ask:${pair}`);

//       if (!bestPrice) {
//         const market = await prisma.market.findFirst({
//           where: {
//             ticker: pair,
//           },
//         });
//         if (!market) {
//           res.status(400).json({
//             message: "market not found!",
//           });
//           return;
//         }
//         bestPrice = market?.price.toString();
//       }

//       const amount = parseFloat(bestPrice) * quantity;

//       const bufferPercentage = parseFloat(MARKET_ORDER_BUFFER) || 0.03;

//       bufferedAmount = amount * (1 + bufferPercentage);

//       if (quoteWallet.available < bufferedAmount) {
//         res.status(400).json({ message: "insufficient funds" });
//         return;
//       }

//       await prisma.wallet.update({
//         where: {
//           id: quoteWallet?.id,
//         },
//         data: {
//           available: {
//             decrement: bufferedAmount,
//           },
//           locked: {
//             increment: bufferedAmount,
//           },
//         },
//       });
//     }

//     if (side === "SELL" && type === "LIMIT") {
//       const quantityToLock = quantity;

//       if (baseWallet.available < quantityToLock) {
//         res.status(400).json({ message: "insufficient balance" });
//         return;
//       }
//       await prisma.wallet.update({
//         where: {
//           id: baseWallet?.id,
//         },
//         data: {
//           available: {
//             decrement: quantityToLock,
//           },
//           locked: {
//             increment: quantityToLock,
//           },
//         },
//       });
//     }

//     if (side === "SELL" && type === "MARKET") {
//       if (quantity <= 0) {
//         res.status(400).json({ message: "Quantity Should be greater than 0" });
//         return;
//       }

//       if (quantity > baseWallet.available) {
//         res.status(400).json({ message: "insufficient balance" });
//         return;
//       }
//       await prisma.wallet.update({
//         where: {
//           id: baseWallet?.id,
//         },
//         data: {
//           available: {
//             decrement: quantity,
//           },
//           locked: {
//             increment: quantity,
//           },
//         },
//       });
//     }

//     let orderData = {
//       event: "CREATE_ORDER",
//       requestId,
//       side,
//       type,
//       userId,
//       quantity,
//       price,
//       pair,
//       timestamp: Date.now(),
//       ...(type === "MARKET" && {
//           bufferedPrice: bestPrice,
//           bufferedAmount,
//       })
//     };

//     await redisClient.xadd(
//       MATCHING_ENGINE_STREAM,
//       "*",
//       "data",
//       JSON.stringify(orderData)
//     );

//     res.status(200).json({
//       success: true,
//       requestId,
//       message: "Order Successfully Initiated",
//     });
//   } catch (error) {
//     console.error("Order creation failed", error);

//     res.status(500).json({
//       message: "Internal Server Error",
//       success: false,
//     });
//   }
// });

// orderRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
//   try {
//     const userId = req.userId!;

//     const pair = req.query.pair as string;

//     const orders = await prisma.order.findMany({
//       where: {
//         userId,
//         status: "OPEN",
//         ...(pair ? { pair } : {}),
//       },
//       select: {
//         price: true,
//         originalQuantity: true,
//         remainingQuantity : true,
//         side: true,
//         type: true,
//         createdAt: true,
//         id: true,
//       },
//     });

//     const { buyOrders, sellOrders } = splitOrders(orders);

//     res.status(200).json({
//       pair: pair ?? null,
//       buyOrders,
//       sellOrders,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Internal Server Error",
//     });
//   }
// });

// orderRouter.delete(
//   "/:orderId",
//   authMiddleware,
//   async (req: Request, res: Response) => {
//     try {
//       const userId = req.userId!;

//       const orderId = req.params.orderId!;

//       const order = await prisma.order.findFirst({
//         where: {
//           userId,
//           id: orderId,
//         },
//       });

//       if (!order) {
//         res.status(404).json({
//           message: "Order not found!",
//         });
//         return;
//       }

//       if (order.status === "CANCELLED") {
//         res.status(400).json({ message: "order is already cancelled" });
//         return;
//       }

//       if (order.status === "FILLED" || order.status === "PARTIALLY_FILLED") {
//         console.error(
//           "order is already filled or partially filled, cannot cancel now"
//         );
//         return;
//       }

//       const cancelRequestId = crypto.randomUUID();

//       const cancelRequest = {
//         event: "CANCEL_ORDER",
//         requestId: cancelRequestId,
//         userId,
//         orderId,
//         timestamp: Date.now(),
//       };

//       await redisClient.xadd(
//         MATCHING_ENGINE_STREAM,
//         "*",
//         "data",
//         JSON.stringify(cancelRequest)
//       );

//       res.status(200).json({
//         message: "Order successfully cancelled",
//       });
//     } catch (error) {
//       res.status(500).json({
//         message: "Internal Server Error",
//       });
//     }
//   }
// );

export default orderRouter;
