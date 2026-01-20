import { kafka } from "./client";

export function createConsumer(groupId: string) {
  return kafka.consumer({
    groupId,
    retry: {
      retries: 10
    }
  });
}
