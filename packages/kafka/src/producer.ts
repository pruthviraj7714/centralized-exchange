import { kafka } from "./client";

export const producer = kafka.producer({
  allowAutoTopicCreation: false,
  idempotent: true,
  maxInFlightRequests: 1,
  retry: {
    retries: 10
  }
});

export async function initProducer() {
  await producer.connect();
}
