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

    const boughtAmount = trade.quantity.mul(trade.price);
    const soldQty = trade.quantity;

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

async function main() {
  console.log("Settlement service is running...");

  const consumer = createConsumer("settlement-service");
  await consumer.connect();

  await consumer.subscribe({ topic: "trades.executed" });
  await consumer.subscribe({ topic: "orders.updated" })

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
        }

      } catch (error) {
        console.error(error);
      }
    },
  });

}

main();
