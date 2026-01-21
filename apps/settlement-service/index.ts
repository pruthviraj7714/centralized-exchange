import { createConsumer } from "@repo/kafka/src/consumer";
import prisma from "@repo/db";

const settleExectuedTrades = async () => {
  console.log('executed trade in db');
}

const settleUpdatedOrders = async (order: string) => {
  try {
    const orderData = JSON.parse(order);
    const updatedOrder = await prisma.order.update({
      where: {
        id: orderData.id
      },
      data: {
        status: orderData.status,
        updatedAt: orderData.updatedAt,
        remainingQuantity: orderData.remainingQuantity,

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
        return;
      }
      try {
        const eventType = JSON.parse(message.value.toString()).eventType;

        switch (eventType) {
          case "ORDER_UPDATED":
            settleUpdatedOrders(message.value.toString());
            break;
          case "TRADE_EXECUTED":
            settleExectuedTrades();
            break;
        }

      } catch (error) {
        console.error(error);
      }
    },
  });

}

main();
