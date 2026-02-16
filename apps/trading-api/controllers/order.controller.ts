import { OrderSchema } from "@repo/common";
import { formatValidationError } from "../utils";
import type { Request, Response } from "express";
import prisma from "@repo/db";
import { producer } from "@repo/kafka/src/producer";
import { COMMAND_TOPICS } from "@repo/kafka/src/topics";
import { Decimal } from 'decimal.js'

await producer.connect();

const placeOrderController = async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId!;
    const validationResult = OrderSchema.safeParse(req.body);

    if (!userId) {
      res.status(400).json({
        message: "user ID not passed"
      });
      return;
    }

    if (!validationResult.success) {
      res.status(400).json({
        message: "Invalid Schema",
        error: formatValidationError(validationResult.error),
      });
      return;
    }

    const { pair, price, quantity, side, type, quoteAmount } = validationResult.data;

    if (type === "LIMIT" && (!price || price === undefined || price.lte(0))) {
      res.status(422).json({
        message: "Price is required for limit orders and must be greater than 0",
      });
      return;
    }

    if (type === "LIMIT" && (!quantity || quantity === undefined || quantity.lte(0))) {
      res.status(422).json({
        message: "Quantity is required for limit orders and must be greater than 0"
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

    const [baseAsset, quoteAsset] = pair.split("-");

    let order;
    const market = await prisma.market.findFirst({
      where: {
        symbol: pair,
      },
    });

    if (!market) {
      res.status(404).json({
        message: "Invalid Market",
      });
      return;
    }

    if (type === "LIMIT") {

      const qty = quantity!;

      if (side === "BUY") {
        const totalAmount = price!.mul(qty);

        order = await prisma.$transaction(async (tx) => {
          const [quoteAssetWallet] = await tx.$queryRaw<{ id: string }[]>`SELECT * FROM "Wallet" WHERE "asset" = ${quoteAsset} AND "userId" = ${userId} FOR UPDATE`;

          if (!quoteAssetWallet) {
            res.status(404).json({
              message: "Wallet not found for asset",
            });
            return;
          }
          const updated = await tx.wallet.updateMany({
            where: {
              id: quoteAssetWallet.id,
              available: {
                gte: totalAmount
              }
            },
            data: {
              available: {
                decrement: totalAmount,
              },
              locked: {
                increment: totalAmount,
              },
            },
          });

          if (updated.count === 0) {
            throw new Error("Insufficient Balance");
          }

          const order = await tx.order.create({
            data: {
              originalQuantity: qty,
              remainingQuantity: qty,
              side,
              type,
              userId,
              marketId: market.id,
              price,
            },
          });

          return order;
        });
      } else {
        const qtyToSell = quantity!;

        order = await prisma.$transaction(async (tx) => {
          const [baseAssetWallet] = await tx.$queryRaw<{ id: string }[]>`SELECT * FROM "Wallet" WHERE "asset" = ${baseAsset} AND "userId" = ${userId} FOR UPDATE`;

          if (!baseAssetWallet) {
            res.status(404).json({
              message: "Wallet not found for asset",
            });
            return;
          }

          const updated = await tx.wallet.updateMany({
            where: {
              id: baseAssetWallet.id,
              available: {
                gte: qtyToSell
              }
            },
            data: {
              available: {
                decrement: qtyToSell,
              },
              locked: {
                increment: qtyToSell,
              },
            },
          });

          if (updated.count === 0) {
            throw new Error("Insufficient Balance")
          }

          const order = await tx.order.create({
            data: {
              originalQuantity: qtyToSell,
              remainingQuantity: qtyToSell,
              side,
              type,
              marketId: market.id,
              userId,
              price,
            },
          });

          return order;
        });
      }
    } else {
      if (side === "BUY") {
        const spendAmount = quoteAmount!;

        order = await prisma.$transaction(async (tx) => {
          const [quoteAssetWallet] = await tx.$queryRaw<{ id: string }[]>`SELECT * FROM "Wallet" WHERE "asset" = ${quoteAsset} AND "userId" = ${userId} FOR UPDATE`;

          if (!quoteAssetWallet) {
            res.status(404).json({
              message: "Wallet not found for asset",
            });
            return;
          }

          const updated = await tx.wallet.updateMany({
            where: {
              id: quoteAssetWallet.id,
              available: {
                gte: spendAmount
              }
            },
            data: {
              available: {
                decrement: spendAmount
              },
              locked: {
                increment: spendAmount
              }
            }

          })

          if (updated.count === 0) {
            throw new Error("Insufficient Balance")
          }

          const order = await tx.order.create({
            data: {
              originalQuantity: new Decimal(0),
              remainingQuantity: new Decimal(0),
              quoteAmount: spendAmount,
              quoteRemaining: spendAmount,
              quoteSpent: new Decimal(0),
              price: null,
              side,
              type,
              userId,
              marketId: market.id,
            }
          });

          return order;
        })

      } else {
        const qtyToSell = quantity!;

        order = await prisma.$transaction(async (tx) => {

          const [baseAssetWallet] = await tx.$queryRaw<{ id: string }[]>`SELECT * FROM "Wallet" WHERE "asset" = ${baseAsset} AND "userId" = ${userId} FOR UPDATE`;

          if (!baseAssetWallet) {
            res.status(404).json({
              message: "Wallet not found for asset",
            });
            return;
          }

          const updated = await tx.wallet.updateMany({
            where: {
              id: baseAssetWallet.id,
              available: {
                gte: qtyToSell
              }
            },
            data: {
              available: {
                decrement: qtyToSell
              },
              locked: {
                increment: qtyToSell
              }
            }
          })

          if (updated.count === 0) {
            throw new Error("Insufficient Balance");
          }

          const order = await tx.order.create({
            data: {
              originalQuantity: new Decimal(qtyToSell),
              remainingQuantity: new Decimal(qtyToSell),
              price: null,
              side: side,
              type: type,
              userId: userId,
              marketId: market.id,
            }
          })

          return order;
        })

      }
    }

    if (!order) {
      return res.status(500).json({
        message: "Failed to create order"
      });
    }

    const result = await producer.send({
      topic: COMMAND_TOPICS.ORDER_CREATE,
      messages: [
        {
          key: order.marketId,
          value: JSON.stringify({ ...order, pair: market.symbol, event: "CREATE_ORDER", eventId: crypto.randomUUID() }),
        },
      ],
    });

    console.log(result);

    res.status(202).json({
      message: "Order request accepted",
    });
  } catch (error: any) {
    if (error.message?.includes("Insufficient Balance")) {
      return res.status(409).json({
        message: "Insufficient Balance"
      });

    }
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  };
}

const cancelOrderController = async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id as string;
    const userId = req.userId!;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      },
    });

    if (!order) {
      res.status(400).json({
        message: "Invalid Order ID",
      });
      return;
    }

    if (order.status === "FILLED" || order.status === "CANCELLED") {
      res.status(400).json({
        message: "Order is already filled or cancelled",
      });
      return;
    }

    const result = await producer.send({
      topic: COMMAND_TOPICS.ORDER_CANCEL,
      messages: [
        {
          key: order.marketId,
          value: JSON.stringify({ orderId: order.id, event: "CANCEL_ORDER", eventId: crypto.randomUUID() }),
        },
      ],
    });

    console.log(result);

    res.status(202).json({
      message: "Cancel request accepted",
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export { placeOrderController, cancelOrderController };

