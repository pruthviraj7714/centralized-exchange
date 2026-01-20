
import { Kafka } from "kafkajs";

export const kafka = new Kafka({
  clientId: "cex-platform",
  brokers: process.env.KAFKA_BROKERS!.split(","),
  retry: {
    retries: 10
  }
});
