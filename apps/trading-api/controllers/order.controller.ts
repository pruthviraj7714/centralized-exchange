import { OrderSchema } from "@repo/common";
import { formatValidationError } from "../utils";
import type { Request, Response } from "express";
import prisma from "@repo/db";
import { producer } from "@repo/kafka/src/producer";
import { TOPICS } from "@repo/kafka/src/topics";

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

    if (type === "MARKET" && side === "BUY" && !quoteAmount) {
      res.status(400).json({
        message: "Spend amount is required for market buy orders",
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

      if (side === "BUY") {
        const totalAmount = price!.mul(quantity);

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
              originalQuantity: quantity,
              remainingQuantity: quantity,
              side,
              status: "OPEN",
              type,
              userId,
              marketId: market.id,
              price,
            },
          });

          return order;
        });
      } else {
        const qtyToSell = quantity;

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
              status: "OPEN",
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
              status: "OPEN",
              userId: userId,
              marketId: market.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          })

          return order;
        })

      } else {
        const qtyToSell = quantity;

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
              status: "OPEN",
              userId: userId,
              marketId: market.id,
            }
          })

          return order;
        })

      }
    }

    const result = await producer.send({
      topic: TOPICS.ORDER_CREATE,
      messages: [
        {
          key: order.id,
          value: JSON.stringify({ ...order, pair: market.symbol, event: "CREATE_ORDER" }),
        },
      ],
    });

    console.log(result);

    res.status(200).json({
      message: "Order successfully Initiated",
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
      },
      include: {
        market: {
          select: {
            baseAsset: true,
            quoteAsset: true,
          },
        },
      },
    });

    if (!order) {
      res.status(400).json({
        message: "Invalid Order ID",
      });
      return;
    }

    const amount = order.remainingQuantity;

    const wallet = await prisma.wallet.findFirst({
      where: {
        userId,
        asset:
          order.side === "BUY"
            ? order.market.baseAsset
            : order.market.quoteAsset,
      },
    });

    if (!wallet) {
      res.status(400).json({
        message: "Invalid Wallet",
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      (await tx.walletLedger.create({
        data: {
          amount: amount,
          type: "REFUND",
          walletId: wallet.id,
          balanceAfter: wallet.available.plus(amount),
        },
      }),
        await tx.order.update({
          where: {
            id: orderId,
            userId,
          },
          data: {
            status: "CANCELLED",
          },
        }));
    });

    const result = await producer.send({
      topic: TOPICS.ORDER_CANCEL,
      messages: [
        {
          key: order.id,
          value: JSON.stringify({ orderId: order.id, event: "CANCEL_ORDER" }),
        },
      ],
    });

    console.log(result);

    res.status(200).json({
      message: "Order Cancelled Successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export { placeOrderController, cancelOrderController };

