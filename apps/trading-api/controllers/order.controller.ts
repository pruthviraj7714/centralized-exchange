import { OrderSchema } from "@repo/common";
import { formatValidationError } from "../utils";
import type { Request, Response } from "express";
import prisma from "@repo/db";
import { producer } from "@repo/kafka/src/producer";
import { COMMAND_TOPICS } from "@repo/kafka/src/topics";
import { Decimal } from "decimal.js";
import type { IOrder } from "../types/types";

await producer.connect();

const placeOrderController = async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      res.status(400).json({
        message: "user ID not passed",
      });
      return;
    }

    const validationResult = OrderSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        message: "Invalid Schema",
        error: formatValidationError(validationResult.error),
      });
      return;
    }

    const { pair, price, quantity, side, type, quoteAmount, clientOrderId } =
      validationResult.data;

    if (type === "LIMIT" && (!price || price === undefined || price.lte(0))) {
      res.status(422).json({
        message:
          "Price is required for limit orders and must be greater than 0",
      });
      return;
    }

    if (
      type === "LIMIT" &&
      (!quantity || quantity === undefined || quantity.lte(0))
    ) {
      res.status(422).json({
        message:
          "Quantity is required for limit orders and must be greater than 0",
      });
      return;
    }

    if (type === "MARKET" && side === "BUY" && !quoteAmount) {
      res.status(422).json({
        message: "Spend amount is required for market buy orders",
      });
      return;
    }

    if (type === "MARKET" && side === "SELL" && !quantity) {
      res.status(422).json({
        message: "Quantity is required for market sell orders",
      });
      return;
    }

    let isNewOrder = true;

    const order = await prisma.$transaction(async (tx) => {
      const market = await tx.market.findUnique({
        where: {
          symbol: pair,
        },
      });

      if (!market) {
        throw new Error("Invalid Market");
      }

      const baseAsset = market.baseAsset;
      const quoteAsset = market.quoteAsset;

      const insertedOrder = await tx.$queryRaw<IOrder[]>`INSERT INTO "Order" (
        "id",
        "clientOrderId",
        "originalQuantity",
        "remainingQuantity",
        "quoteAmount",
        "quoteRemaining",
        "quoteSpent",
        "price",
        "side",
        "type",
        "userId",
        "marketId",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${crypto.randomUUID()},
        ${clientOrderId},
        ${type === "LIMIT" ? quantity : new Decimal(0)},
        ${type === "LIMIT" ? quantity : new Decimal(0)},
        ${type === "MARKET" && side === "BUY" ? quoteAmount : new Decimal(0)},
        ${type === "MARKET" && side === "BUY" ? quoteAmount : new Decimal(0)},
        ${type === "MARKET" ? new Decimal(0) : new Decimal(0)},
        ${type === "MARKET" ? null : price},
        ${side},
        ${type},
        ${userId},
        ${market.id},
        ${new Date()},
        ${new Date()}
      ) ON CONFLICT ("clientOrderId", "userId") DO NOTHING RETURNING *`;

      if (insertedOrder.length === 0) {
        isNewOrder = false;
        const existingOrder = await tx.order.findFirst({
          where: {
            clientOrderId,
            userId,
          },
        });
        return [existingOrder];
      }

      const createdOrder = insertedOrder[0];

      const assetAmount =
        type === "LIMIT"
          ? side === "BUY"
            ? price!.mul(quantity!)
            : quantity!
          : side === "BUY"
            ? quoteAmount!
            : quantity!;

      const updated = await tx.wallet.updateMany({
        where: {
          asset: side === "BUY" ? quoteAsset : baseAsset,
          userId,
          available: {
            gte: assetAmount,
          },
        },
        data: {
          available: {
            decrement: assetAmount,
          },
          locked: {
            increment: assetAmount,
          },
        },
      });

      if (updated.count === 0) {
        throw new Error("Insufficient Balance");
      }

      return [createdOrder];
    });

    const createdOrder = order[0];

    if (!createdOrder) {
      throw new Error("Failed to create order");
    }

    if (isNewOrder) {
      const result = await producer.send({
        topic: COMMAND_TOPICS.ORDER_CREATE,
        messages: [
          {
            key: createdOrder.marketId,
            value: JSON.stringify({
              ...createdOrder,
              pair: pair,
              event: "CREATE_ORDER",
              eventId: `order-${createdOrder.id}`,
            }),
          },
        ],
      });
      console.log(result);
    }

    res.status(202).json({
      message: "Order request accepted",
    });
  } catch (error: any) {
    console.log(error);
    if (error.message?.includes("Insufficient Balance")) {
      return res.status(409).json({
        message: "Insufficient Balance",
      });
    }
    if (error.message?.includes("deadlock detected")) {
      return res.status(409).json({
        message: "Deadlock detected",
      });
    }
    if (error.message?.includes("Invalid Market")) {
      return res.status(400).json({
        message: "Invalid Market",
      });
    }
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const cancelOrderController = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id as string;
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      res.status(400).json({
        message: "user ID not passed",
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        market: {
          select: {
            symbol: true,
          },
        },
      },
    });

    if (!order || order.userId !== userId) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const updated = await prisma.order.updateMany({
      where: {
        id: orderId,
        userId,
        status: {
          notIn: ["FILLED", "CANCELLED", "EXPIRED"],
        },
      },
      data: {
        status: "CANCEL_REQUESTED",
      },
    });

    if (updated.count === 0) {
      return res
        .status(400)
        .json({ message: "Order might already be filled or cancelled" });
    }

    const result = await producer.send({
      topic: COMMAND_TOPICS.ORDER_CANCEL,
      messages: [
        {
          key: order.marketId,
          value: JSON.stringify({
            orderId: order.id,
            pair: order.market.symbol,
            event: "CANCEL_ORDER",
            eventId: `cancel-${order.id}`,
          }),
        },
      ],
    });

    console.log("cancel_event_sent", { orderId, result });

    res.status(202).json({
      message: "Cancel request accepted",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export { placeOrderController, cancelOrderController };
