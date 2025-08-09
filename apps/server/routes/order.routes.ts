import { Router, type Request, type Response } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import { OrderSchema } from "@repo/common";
import prisma from "@repo/db";
import { SUPPORTED_PAIRS } from "../utils/constants";

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

    if (type === "LIMIT") {
      if (price <= 0 || quantity <= 0) {
        res.status(400).json({
          message:
            "Please Check Amount or Quantity it should be greater than 0",
        });
        return;
      }
    }
    const wallets = await prisma.wallet.findMany({
      where: {
        userId,
      },
    });

    const [baseAsset, quoteAsset] = pair.split("-");
    const amount = price * quantity;

    if (side === "BUY") {
      const quoteWallet = wallets.find((w) => w.asset === quoteAsset);

      if (!quoteWallet) {
        res.status(400).json({
          message: "No Wallet found!",
        });
        return;
      }

      if (quoteWallet.available < amount) {
        res.status(400).json({
          message: "Insufficient balance",
        });
        return;
      }
      const order = await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: {
            id: quoteWallet.id,
          },
          data: {
            available: {
              decrement: amount,
            },
            locked: {
              increment: amount,
            },
          },
        });
        const order = await tx.order.create({
          data: {
            userId,
            pair,
            price,
            type,
            quantity,
            side,
            status: "OPEN",
          },
        });
        return order;
      });
      res.status(200).json({
        message: "Order successfully Placed",
        id: order.id,
      });
    } else {
      const baseWallet = wallets.find((w) => w.asset === baseAsset);

      if (!baseWallet) {
        res.status(400).json({
          message: "No Wallet found!",
        });
        return;
      }

      if (baseWallet.available < amount) {
        res.status(400).json({
          message: "Insufficient balance",
        });
        return;
      }

      const order = await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: {
            id: baseWallet.id,
          },
          data: {
            available: {
              decrement: quantity,
            },
            locked: {
              increment: quantity,
            },
          },
        });
        const order = await tx.order.create({
          data: {
            userId,
            pair,
            price,
            quantity,
            side,
            type,
            status: "OPEN",
          },
        });
        return order;
      });
      res.status(200).json({
        message: "Order successfully Placed",
        id: order.id,
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
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

      const orderId = req.params.orderId;

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

      if (order.status === "CANCELLED") {
        res.status(409).json({
          message: "Order is already cancelled",
        });
        return;
      }

      if (order.status === "FILLED" || order.status === "PARTIAL") {
        res.status(400).json({
          message: "order cannot be cancelled now!",
        });
        return;
      }

      const [baseAsset, quoteAsset] = order.pair.split("-");
      const amount = order.price * order.quantity;

      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SELECT * FROM "Order" WHERE id = $1 FOR UPDATE`,
          order.id
        );

        await tx.$executeRawUnsafe(
          `
          SELECT * FROM "Wallet" 
          WHERE asset = $1 AND "userId" = $2 FOR UPDATE
        `,
          order.side === "BUY" ? quoteAsset : baseAsset,
          userId
        );

        await tx.wallet.updateMany({
          where: {
            asset: order.side === "BUY" ? quoteAsset : baseAsset,
            userId,
          },
          data: {
            locked: {
              decrement: order.side === "BUY" ? amount : order.quantity,
            },
            available: {
              increment: order.side === "BUY" ? amount : order.quantity,
            },
          },
        });

        await tx.order.update({
          where: {
            id: order.id,
          },
          data: {
            status: "CANCELLED",
          },
        });
      });

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
