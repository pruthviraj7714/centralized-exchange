import { createConsumer } from "@repo/kafka/src/consumer";
import prisma from "@repo/db";
import Decimal from "decimal.js";
import type { OrderEvent, TradeEvent } from "./types";
import redisclient from "@repo/redisclient";

const settleExectuedTrades = async (trade: TradeEvent) => {
  try {
    const { buyOrderId, sellOrderId, executedAt, quantity, price, quoteSpent, quoteRemaining } = trade;

    const tradeResult = await prisma.$transaction(async (tx) => {
      const orders = await tx.$queryRaw<
        {
          id: string;
          userId: string;
          marketId: string;
          baseAsset: string;
          quoteAsset: string;
          type: "LIMIT" | "MARKET",
          status: "PENDING" | "FILLED" | "PARTIALLY_FILLED" | "CANCELED" | "EXPIRED",
          remainingQuantity: Decimal;
          originalQuantity: Decimal;
          spentAmount: Decimal;
          spentRemaining: Decimal
        }[]
      >`
      SELECT 
        o.id,
        o."userId",
        o."marketId",
        o."type",
        o."status",
        o."remainingQuantity",
        o."originalQuantity",
        o."spentAmount",
        o."spentRemaining",
        m."baseAsset",
        m."quoteAsset"
      FROM "Order" o
      JOIN "Market" m ON m.id = o."marketId"
      WHERE o.id IN (${buyOrderId}, ${sellOrderId})
      FOR UPDATE
      `;

      const buyOrder = orders.find((order) => order.id === buyOrderId);
      const sellOrder = orders.find((order) => order.id === sellOrderId);

      if (!buyOrder || !sellOrder) {
        throw new Error("Invalid Order Id found!");
      }

      if (!["PENDING", "PARTIALLY_FILLED"].includes(buyOrder.status)) {
        throw Error("Invalid state transition");
      }

      if (!["PENDING", "PARTIALLY_FILLED"].includes(sellOrder.status)) {
        throw Error("Invalid state transition");
      }

      const wallets = await tx.$queryRaw<{ id: string, userId: string, asset: string, available: Decimal, locked: Decimal }[]>`
        SELECT id, "userId", "asset", available, locked
        FROM "Wallet"
        WHERE ("userId", "asset") IN (
          (${buyOrder.userId}, ${buyOrder.baseAsset}),
          (${buyOrder.userId}, ${buyOrder.quoteAsset}),
          (${sellOrder.userId}, ${sellOrder.baseAsset}),
          (${sellOrder.userId}, ${sellOrder.quoteAsset})
        )
        ORDER BY "userId" ASC, "asset" ASC
        FOR UPDATE
      `;

      const baseAssetBuyerWallet = wallets.find((wallet) => wallet.userId === buyOrder.userId && wallet.asset === buyOrder.baseAsset);
      const quoteAssetBuyerWallet = wallets.find((wallet) => wallet.userId === buyOrder.userId && wallet.asset === buyOrder.quoteAsset);
      const baseAssetSellerWallet = wallets.find((wallet) => wallet.userId === sellOrder.userId && wallet.asset === sellOrder.baseAsset);
      const quoteAssetSellerWallet = wallets.find((wallet) => wallet.userId === sellOrder.userId && wallet.asset === sellOrder.quoteAsset);

      if (!baseAssetBuyerWallet || !quoteAssetBuyerWallet || !baseAssetSellerWallet || !quoteAssetSellerWallet) {
        throw new Error("Invalid Wallet found!");
      }

      const tradeQty = new Decimal(quantity);
      const tradePrice = new Decimal(price);
      const tradeValue = tradeQty.mul(tradePrice);

      const buyerQuoteAmount = tradeValue;
      const buyerBaseAmount = tradeQty;
      const sellerQuoteAmount = tradeValue;
      const sellerBaseAmount = tradeQty;

      const remainingSellOrderQty = sellOrder.remainingQuantity.minus(tradeQty);
      const remainingBuyOrderQty = buyOrder.type === "MARKET" ? buyOrder.spentRemaining.minus(quoteSpent!) : buyOrder.remainingQuantity.minus(tradeValue);

      if (quoteAssetBuyerWallet.locked.lt(tradeValue))
        throw new Error("Buyer locked underflow");

      if (baseAssetSellerWallet.locked.lt(tradeQty))
        throw new Error("Seller locked underflow");

      await tx.wallet.update({
        where: {
          id: baseAssetBuyerWallet.id
        },
        data: {
          available: {
            increment: buyerBaseAmount
          },
        }
      })

      await tx.wallet.update({
        where: {
          id: quoteAssetBuyerWallet.id
        },
        data: {
          locked: {
            decrement: buyerQuoteAmount
          }
        }
      })

      await tx.wallet.update({
        where: {
          id: baseAssetSellerWallet.id
        },
        data: {
          locked: {
            decrement: sellerBaseAmount
          }
        }
      })

      await tx.wallet.update({
        where: {
          id: quoteAssetSellerWallet.id
        },
        data: {
          available: {
            increment: sellerQuoteAmount
          }
        }
      })

      await tx.order.update({
        where: {
          id: buyOrder.id
        },
        data: {
          status: remainingBuyOrderQty.gt(0) ? 'PARTIALLY_FILLED' : 'FILLED',
          remainingQuantity: remainingBuyOrderQty,
          ...((buyOrder.type === "MARKET") && { spentRemaining: new Decimal(quoteRemaining!) })
        }
      })

      await tx.order.update({
        where: {
          id: sellOrder.id
        },
        data: {
          status: remainingSellOrderQty.gt(0) ? 'PARTIALLY_FILLED' : 'FILLED',
          remainingQuantity: remainingSellOrderQty
        }
      })

      const trade = await tx.trade.create({
        data: {
          makerFee: new Decimal(0),
          price: new Decimal(price),
          quantity: new Decimal(quantity),
          takerFee: new Decimal(0),
          marketId: buyOrder.marketId,
          buyOrderId: buyOrder.id,
          sellOrderId: sellOrder.id,
          makerId: buyOrder.userId,
          takerId: sellOrder.userId,
          executedAt: new Date(executedAt),
        }
      })

      return trade;
    })

    console.log('executed trade in db', tradeResult);
  } catch (error) {
    console.error('Error settling executed trade:', error);
    throw error;
  }

}

const settleUpdatedOrders = async (order: OrderEvent) => {
  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const [odr] = await tx.$queryRaw<
        {
          id: string;
          userId: string;
          side: string;
          price: string;
          originalQuantity: string;
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
    o."originalQuantity",
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

      if (Decimal(order.remainingQuantity).lt(0)) {
        throw new Error("Invalid remaining quantity on cancel");
      }

      const newRemainingQty = Decimal(order.remainingQuantity);

      const updateOrder = await tx.order.update({
        where: {
          id: odr.id,
          userId: odr.userId,
        },
        data: {
          remainingQuantity: newRemainingQty,
          status: newRemainingQty.gt(0) ? "PARTIALLY_FILLED" : "FILLED",
          updatedAt: new Date(order.updatedAt),
        },
      });

      return updateOrder;
    })

    console.log('updated order in db', updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
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
          type: string;
        }[]
      >`
  SELECT
    o.id,
    o."userId",
    o.side,
    o.status,
    o."remainingQuantity",
    o."price",
    o."type",
    m."baseAsset",
    m."quoteAsset"
  FROM "Order" o
  JOIN "Market" m ON o."marketId" = m.id
  WHERE o.id = ${order.orderId} FOR UPDATE
`;

      if (!odr) {
        throw new Error('Order not found');
      }

      if (odr.status === "CANCELLED" || odr.status === "FILLED") return;


      if (order.type === "LIMIT" && Decimal(order.remainingQuantity).lte(0)) {
        throw new Error("Invalid remaining quantity on cancel");
      }

      const refundAsset = order.side === "BUY" ? odr.quoteAsset : odr.baseAsset;

      const [wallet] = await tx.$queryRaw<{ id: string, available: Decimal, locked: Decimal }[]>`SELECT * FROM "Wallet" WHERE "userId" = ${odr.userId} AND "asset" = ${refundAsset} FOR UPDATE`;

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      let refundAmount: Decimal;

      if (order.type === "LIMIT") {
        refundAmount = order.side === "BUY" ? Decimal(order.price!).mul(Decimal(order.remainingQuantity)) : Decimal(order.remainingQuantity);
      } else {
        refundAmount = order.side === "BUY" ? Decimal(order.quoteRemaining) : Decimal(order.remainingQuantity);
      }

      await tx.wallet.update({
        where: {
          id: wallet.id
        },
        data: {
          available: {
            increment: refundAmount
          },
          locked: {
            decrement: refundAmount
          },
          updatedAt: new Date(order.updatedAt),
        }
      })

      await tx.walletLedger.create({
        data: {
          amount: refundAmount,
          direction: "CREDIT",
          asset: refundAsset,
          userId: odr.userId,
          balanceType: "AVAILABLE",
          entryType: "TRADE_UNLOCK",
          metadata: "ORDER_CANCELLED",
          referenceId: order.orderId,
          balanceBefore: wallet.available,
          referenceType: "ORDER",
          walletId: wallet.id,
          balanceAfter: wallet.available.plus(refundAmount),
        },
      })
      await tx.order.update({
        where: {
          id: order.orderId,
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
    throw error;
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
    throw error;
  }
}

const settleExpiredOrders = async (order: OrderEvent) => {
  try {
    console.log('Received order expired event:', order);

    await prisma.$transaction(async (tx) => {
      const [odr] = await tx.$queryRaw<{ id: string, userId: string, side: string, status: string, remainingQuantity: string, price: string, baseAsset: string, quoteAsset: string }[]>`
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
      `

      if (!odr) {
        throw new Error('Order request not found');
      }

      if (odr.status !== "EXPIRED") {
        throw new Error('Order is not expired');
      }

      const orderSide = odr.side === "BUY" ? "SELL" : "BUY";
      const refundAsset = orderSide === "BUY" ? odr.quoteAsset : odr.baseAsset;

      const userId = order.userId;

      const [wallet] = await tx.$queryRaw<{ id: string, available: Decimal, locked: Decimal }[]>`SELECT * FROM "Wallet" WHERE "userId" = ${userId} AND "asset" = ${refundAsset} FOR UPDATE`;

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      let refundAmount: Decimal;

      if (order.type === "LIMIT") {
        refundAmount = order.side === "BUY" ? Decimal(order.price!).mul(Decimal(order.remainingQuantity)) : Decimal(order.remainingQuantity);
      } else {
        refundAmount = order.side === "BUY" ? Decimal(order.quoteRemaining) : Decimal(order.remainingQuantity);
      }

      await tx.wallet.update({
        where: {
          id: wallet.id
        },
        data: {
          available: {
            increment: refundAmount
          },
          locked: {
            decrement: refundAmount
          }
        }
      })

      await tx.walletLedger.create({
        data: {
          amount: refundAmount,
          walletId: wallet.id,
          asset: refundAsset,
          userId: userId,
          balanceAfter: wallet.available.plus(refundAmount),
          entryType: "TRADE_UNLOCK",
          direction: "CREDIT",
          balanceType: "AVAILABLE",
          balanceBefore: wallet.available,
          referenceType: "ORDER",
          metadata: "ORDER_EXPIRED"
        }
      })

    })

    console.log('order expired & refunded successfully in db');
  } catch (error) {
    console.error('Error settling expired order:', error);
    throw error;
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
  await consumer.subscribe({ topic: "orders.expired" })

  await consumer.run({
    eachMessage: async ({ message, topic, partition }) => {
      if (!message.value) {
        console.log('No message value');
        return;
      }
      try {
        const event = JSON.parse(message.value.toString());

        const key = `settled:${event.eventId}`;

        const isProcessed = await redisclient.get(key);

        if (isProcessed) {
          console.log("Event Already Processed", event.eventId);
          return;
        }

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
          case "ORDER_EXPIRED":
            await settleExpiredOrders(event);
            break;
        }

        await consumer.commitOffsets([{
          offset: (Number(message.offset) + 1).toString(),
          partition,
          topic
        }])

        await redisclient.set(key, "1", "EX", 60 * 60 * 24) // 24 hours

      } catch (error) {
        console.error(error);
      }
    },
  });

}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

