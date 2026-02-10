import { createConsumer } from "@repo/kafka/src/consumer";
import prisma from "@repo/db";
import Decimal from "decimal.js";
import type { OrderEvent, TradeEvent } from "./types";

const settleExectuedTrades = async (trade: TradeEvent) => {
  try {
    const { buyOrderId, sellOrderId } = trade;

    const market = await prisma.market.findFirst({
      where: {
        id: trade.marketId
      }
    });

    if (!market) {
      throw new Error("Market not found")
    }

    const [baseAsset, quoteAsset] = market.symbol.split("-");

    if (!baseAsset || !quoteAsset) {
      throw new Error("Invalid Market Symbol")
    }

    const buyOrder = await prisma.order.findUnique({
      where: {
        id: buyOrderId
      }
    })

    const sellOrder = await prisma.order.findUnique({
      where: {
        id: sellOrderId
      }
    })

    if (!buyOrder || !sellOrder) {
      throw new Error("Invalid Order Id found!");
    }

    const remainingBuyOrderQty = buyOrder.remainingQuantity.minus(trade.quantity);
    const remainingSellOrderQty = sellOrder.remainingQuantity.minus(trade.quantity);

    const boughtAmount = new Decimal(trade.quantity).mul(trade.price);
    const soldQty = new Decimal(trade.quantity);

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: {
          id: buyOrder.id
        },
        data: {
          remainingQuantity: remainingBuyOrderQty,
        }
      })

      // Buyer
      await tx.wallet.update({
        where: {
          userId_asset: {
            userId: buyOrder.userId,
            asset: quoteAsset
          }
        },
        data: {
          locked: {
            decrement: boughtAmount
          },
        }
      });

      await tx.wallet.update({
        where: {
          userId_asset: {
            userId: buyOrder.userId,
            asset: baseAsset
          }
        },
        data: {
          available: {
            increment: trade.quantity
          }
        }
      })

      await tx.order.update({
        where: {
          id: sellOrder.id
        },
        data: {
          remainingQuantity: remainingSellOrderQty
        }
      })

      //seller
      await tx.wallet.update({
        where: {
          userId_asset: {
            userId: sellOrder.userId,
            asset: baseAsset
          }
        },
        data: {
          locked: {
            decrement: soldQty
          },
        }
      });

      await tx.wallet.update({
        where: {
          userId_asset: {
            userId: sellOrder.userId,
            asset: quoteAsset
          }
        },
        data: {
          available: {
            increment: boughtAmount
          }
        }
      })

      await tx.trade.create({
        data: {
          makerId: buyOrder.userId,
          takerId: sellOrder.userId,
          makerFee: new Decimal(0), //for now
          price: trade.price,
          quantity: trade.quantity,
          takerFee: new Decimal(0), //for now
          marketId: trade.marketId,
          buyOrderId: trade.buyOrderId,
          sellOrderId: trade.sellOrderId,
          executedAt: new Date(trade.executedAt),
        }
      })
      console.log('executed trade in db');

    })
  } catch (error) {
    console.error('Error settling executed trade:', error);
  }

}

const settleUpdatedOrders = async (order: OrderEvent) => {
  try {
    const updatedOrder = await prisma.order.update({
      where: {
        id: order.orderId
      },
      data: {
        status: order.status,
        updatedAt: new Date(order.updatedAt),
        remainingQuantity: order.remainingQuantity,
      }
    })
    console.log('updated order in db', updatedOrder);

  } catch (error) {
    console.error('Error updating order:', error);
  }

}

const settleCancelledOrders = async (order: OrderEvent) => {
  try {
    await prisma.$transaction(async (tx) => {
      const [odr] = await tx.$queryRaw<
        {
          id: string;
          userId: string;
          side: string;
          price: string;
          remainingQuantity: string;
          baseAsset: string;
          quoteAsset: string;
          status: string;
        }[]
      >`
  SELECT
    o.id,
    o."userId",
    o.side,
    o.status,
    o."remainingQuantity",
    o."price",
    m."baseAsset",
    m."quoteAsset"
  FROM "Order" o
  JOIN "Market" m ON o."marketId" = m.id
  WHERE o.id = ${order.orderId} FOR UPDATE
`;

      if (!odr) {
        throw new Error('Order not found');
      }

      if (odr.status === "CANCELLED") {
        return;
      }

      if (Decimal(odr.remainingQuantity).lte(0)) {
        throw new Error("Invalid remaining quantity on cancel");
      }

      const refundAsset = odr.side === "BUY" ? odr.quoteAsset : odr.baseAsset;

      const wallet = await tx.wallet.findFirst({
        where: {
          userId: odr.userId,
          asset: refundAsset,
        },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }
      await tx.wallet.update({
        where: {
          id: wallet.id
        },
        data: {
          available: {
            increment: odr.side === "BUY" ? Decimal(odr.price).mul(odr.remainingQuantity) : odr.remainingQuantity
          },
          locked: {
            decrement: odr.side === "BUY" ? Decimal(odr.price).mul(odr.remainingQuantity) : odr.remainingQuantity
          }
        }
      })

      await tx.walletLedger.create({
        data: {
          amount: odr.side === "BUY" ? Decimal(odr.price).mul(odr.remainingQuantity) : odr.remainingQuantity,
          type: "REFUND",
          walletId: wallet.id,
          balanceAfter: wallet.available.plus(odr.side === "BUY" ? Decimal(odr.price).mul(odr.remainingQuantity) : odr.remainingQuantity),
        },
      })
      await tx.order.update({
        where: {
          id: odr.id,
          userId: odr.userId,
        },
        data: {
          status: "CANCELLED",
          updatedAt: new Date(order.updatedAt),
        },
      });
    })
    console.log('order cancelled successfully in db');
  } catch (error) {
    console.error('Error cancelling order:', error);
  }
}

const settleOpenedOrders = async (order: OrderEvent) => {
  try {
    console.log('Received order opened event:', order);

    await prisma.$transaction(async (tx) => {
      const odr = await tx.$queryRaw<
        {
          id: string;
          userId: string;
          side: string;
          price: string;
          remainingQuantity: string;
          baseAsset: string;
          quoteAsset: string;
          status: string;
        }[]
      >`
  SELECT
    o.id,
    o."userId",
    o.side,
    o.status,
    o."remainingQuantity",
    o."price",
    m."baseAsset",
    m."quoteAsset"
  FROM "Order" o
  JOIN "Market" m ON o."marketId" = m.id
  WHERE o.id = ${order.orderId} FOR UPDATE
`;

      if (!odr) {
        throw new Error('Order request not found');
      }

      await tx.order.update({
        where: {
          id: order.orderId
        },
        data: {
          status: "OPEN",
          updatedAt: new Date(order.updatedAt),
        }
      })

    })
    console.log('order settled successfully in db');
  } catch (error) {
    console.error('Error settling opened order:', error);
  }
}

async function main() {
  console.log("Settlement service is running...");

  const consumer = createConsumer("settlement-service");
  await consumer.connect();

  await consumer.subscribe({ topic: "trades.executed" });
  await consumer.subscribe({ topic: "orders.updated" });
  await consumer.subscribe({ topic: "orders.cancelled" })
  await consumer.subscribe({ topic: "orders.opened" })

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) {
        console.log('No message value');
        return;
      }
      try {
        const event = JSON.parse(message.value.toString());

        console.log('Received message:', event);
        switch (event.event) {
          case "ORDER_UPDATED":
            await settleUpdatedOrders(event);
            break;
          case "TRADE_EXECUTED":
            await settleExectuedTrades(event);
            break;
          case "ORDER_CANCELED":
            await settleCancelledOrders(event);
            break;
          case "ORDER_OPENED":
            await settleOpenedOrders(event);
            break;
        }

      } catch (error) {
        console.error(error);
      }
    },
  });

}

main();

