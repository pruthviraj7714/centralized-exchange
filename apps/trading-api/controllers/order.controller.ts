import { OrderSchema } from "@repo/common";
import { formatValidationError } from "../utils";
import type { Request, Response } from "express";
import prisma from "@repo/db";
import { producer } from "@repo/kafka/src/producer";
import { COMMAND_TOPICS } from "@repo/kafka/src/topics";

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
      res.status(400).json({
        message: "Price is required for limit orders and must be greater than 0",
      });
      return;
    }

    if (type === "LIMIT" && (!quantity || quantity === undefined || quantity.lte(0))) {
      res.status(400).json({
        message: "Quantity is required for limit orders and must be greater than 0"
      });
      return;
    }

    if (type === "MARKET" && side === "BUY" && !quoteAmount) {
      res.status(400).json({
        message: "Spend amount is required for market buy orders",
      });
      return;
    }

    if (type === "MARKET" && side === "SELL" && !quantity) {
      res.status(400).json({
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
      res.status(400).json({
        message: "Invalid Market",
      });
      return;
    }

    if (type === "LIMIT") {

      const qty = quantity!;

      if (side === "BUY") {
        const totalAmount = price!.mul(qty);

        const wallet = await prisma.wallet.findFirst({
          where: {
            asset: quoteAsset,
            userId,
          },
        });

        if (!wallet) {
          res.status(400).json({
            message: "Invalid Wallet",
          });
          return;
        }

        if (wallet.available.lt(totalAmount)) {
          res.status(400).json({
            message: "Insufficient Balance",
          });
          return;
        }

        order = await prisma.$transaction(async (tx) => {
          await tx.wallet.update({
            where: {
              id: wallet.id,
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

        const wallet = await prisma.wallet.findFirst({
          where: {
            asset: baseAsset,
            userId,
          },
        });

        if (!wallet) {
          res.status(400).json({
            message: "Invalid Wallet",
          });
          return;
        }

        if (wallet.available.lt(qtyToSell)) {
          res.status(400).json({
            message: "Insufficient Balance",
          });
          return;
        }

        order = await prisma.$transaction(async (tx) => {
          await tx.wallet.update({
            where: {
              id: wallet.id,
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
        const wallet = await prisma.wallet.findFirst({
          where: {
            asset: quoteAsset,
            userId,
          },
        });

        if (!wallet) {
          res.status(400).json({
            message: "Invalid Wallet",
          });
          return;
        }

        if (wallet.available.lt(spendAmount)) {
          res.status(400).json({
            message: "Insufficient Balance",
          });
          return;
        }


        order = await prisma.$transaction(async (tx) => {

          await tx.wallet.update({
            where: {
              id: wallet.id
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

          const order = await tx.order.create({
            data: {
              originalQuantity: spendAmount!,
              remainingQuantity: spendAmount!,
              price: null,
              side: side,
              type: type,
              userId: userId,
              marketId: market.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          })

          return order;
        })

      } else {
        const qtyToSell = quantity!;

        const wallet = await prisma.wallet.findFirst({
          where: {
            asset: baseAsset,
            userId,
          },
        });

        if (!wallet) {
          res.status(400).json({
            message: "Invalid Wallet",
          });
          return;
        }

        if (wallet.available.lt(qtyToSell)) {
          res.status(400).json({
            message: "Insufficient Balance",
          });
          return;
        }

        order = await prisma.$transaction(async (tx) => {

          await tx.wallet.update({
            where: {
              id: wallet.id
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

          const order = await tx.order.create({
            data: {
              originalQuantity: qtyToSell,
              remainingQuantity: qtyToSell,
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

    const result = await producer.send({
      topic: COMMAND_TOPICS.ORDER_CREATE,
      messages: [
        {
          key: order.marketId,
          value: JSON.stringify({ ...order, pair: market.symbol, event: "CREATE_ORDER" }),
        },
      ],
    });

    console.log(result);

    res.status(202).json({
      message: "Order request accepted",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

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
          value: JSON.stringify({ orderId: order.id, event: "CANCEL_ORDER" }),
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

