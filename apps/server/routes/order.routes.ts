import { Router, type Request, type Response } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import { OrderSchema } from "@repo/common";
import prisma from "@repo/db";
import { SUPPORTED_PAIRS } from "../utils/constants";
import redisClient from "@repo/redisclient";
import { ORDER_CANCEL_STREAM, ORDER_REQUEST_STREAM } from "../utils/config";

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

orderRouter.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const { success, data } = OrderSchema.safeParse(req.body);

    if (!success) {
      res.status(400).json({
        message: "Invalid Inputs",
      });
      return;
    }

    const { side, quantity, price, pair, type } = data;

    if (pair && !SUPPORTED_PAIRS.includes(pair)) {
      res.status(400).json({
        message: "Invalid Trading pair",
      });
      return;
    }

    if (type === "LIMIT" && (price <= 0 || quantity <= 0)) {
        res.status(400).json({
          message:
            "Please Check Amount or Quantity it should be greater than 0",
        });
        return;
    }

    if (type === "MARKET" && quantity <= 0) {
        res.status(400).json({
          message: "Quantity should be greater than 0",
        });
        return;
    }

    const requestId = crypto.randomUUID();


    let orderData = {
      requestId,
      side,
      type,
      userId,
      quantity,
      price,
      pair,
      createdAt : Date.now()
    }

    await redisClient.xadd(ORDER_REQUEST_STREAM, "*", ...Object.entries(orderData).flat());

    res.status(200).json({
      success : true,
      requestId
    })
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      success : false
    });
  }
});

orderRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const pair = req.query.pair as string;

    const orders = await prisma.order.findMany({
      where: {
        userId,
        status: "OPEN",
        ...(pair ? { pair } : {}),
      },
      select: {
        price: true,
        quantity: true,
        side: true,
        pair: true,
        type: true,
        createdAt: true,
        id : true
      },
    });

    const { buyOrders, sellOrders } = splitOrders(orders);

    res.status(200).json({
      pair: pair ?? null,
      buyOrders,
      sellOrders,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

orderRouter.delete(
  "/:orderId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;

      const orderId = req.params.orderId!;

      const order = await prisma.order.findFirst({
        where: {
          userId,
          id: orderId,
        },
      });

      if (!order) {
        res.status(404).json({
          message: "Order not found!",
        });
        return;
      }

      const cancelRequestId = crypto.randomUUID();

      const cancelRequest = {
        requestId : cancelRequestId,
        userId,
        orderId,
        timestamp : Date.now()
      }

      await redisClient.xadd(ORDER_CANCEL_STREAM, "*", ...Object.entries(cancelRequest).flat())

      res.status(200).json({
        message: "Order successfully cancelled",
      });
    } catch (error) {
      res.status(500).json({
        message: "Internal Server Error",
      });
    }
  }
);

export default orderRouter;
