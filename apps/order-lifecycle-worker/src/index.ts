import prisma from '@repo/db';
import type { IOrder } from './types';
import { producer } from "@repo/kafka/src/producer";
import { EVENT_TOPICS } from "@repo/kafka/src/topics";

const sendOrderExpiredEvent = async (order: IOrder) => {
    console.log("Sending order expired event", order.id);
    try {
        await producer.send({
            topic: EVENT_TOPICS.ORDER_EXPIRED,
            messages: [
                {
                    key: order.marketId,
                    value: JSON.stringify({
                        eventId: crypto.randomUUID(),
                        type: "ORDER_EXPIRED",
                        orderId: order.id,
                        marketId: order.marketId,
                        timestamp: Date.now(),
                        userId: order.userId,
                        remainingQuantity: order.remainingQuantity,
                    })
                }
            ]
        })

    } catch (error) {
        console.error("Error while sending order expired event", error);
        throw error;
    }
}

const expireOrders = async () => {
    console.log("Expire pending orders");
    const expiryTime = new Date(Date.now() - 60 * 1000);
    try {

        const expireOrders = await prisma.$transaction(async (tx) => {
            const orders = await tx.$queryRaw<IOrder[]>`
                SELECT * 
                FROM "Order"
                WHERE "status" = 'PENDING' 
                AND "createdAt" < ${expiryTime}
                FOR UPDATE SKIP LOCKED
            `

            for (const order of orders) {
                await tx.order.update({
                    where: {
                        id: order.id
                    },
                    data: {
                        status: "EXPIRED"
                    }
                })
            }

            return orders;
        })

        for (const order of expireOrders) {
            try {
                await sendOrderExpiredEvent(order);
            } catch (error) {
                console.error("FAILED TO EMIT EXPIRY EVENT", order.id, error);
            }
        }
    } catch (error) {
        console.error("Error while tracking pending orders", error);
        throw error;
    }
}

async function loop() {
    while (true) {
        await expireOrders();
        await new Promise((res, _rej) => setTimeout(res, 60 * 1000));
    }
}

async function main() {
    await producer.connect();
    await loop();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});