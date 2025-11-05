import redisClient from "@repo/redisclient";
import {
  CONSUMER_NAME,
  DLQ_STREAM,
  GROUP_NAME,
} from "./config";

function parseStreamData(streams: any[]) {
  const results: any[] = [];
  for (const [, entries] of streams) {
    for (const [id, fields] of entries) {
      const obj: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        obj[fields[i]] = fields[i + 1];
      }
      if (obj.data) {
        results.push({ streamId: id, ...JSON.parse(obj.data) });
      }
    }
  }
  return results;
}

const createConsumerGroup = async () => {
  try {
    await redisClient.xgroup(
      "CREATE",
      DLQ_STREAM,
      GROUP_NAME,
      "0",
      "MKSTREAM"
    );
  } catch (error: any) {
    if (error.message.includes("BUSYGROUP")) {
      console.log(`group with name ${GROUP_NAME} already exists`);
    } else {
      console.error(error);
    }
  }
};

const processEvents = async (events: any[]) => {
  for(const event of events) {
      switch(event.event) {
        case "ORDER_PLACED" : 

        break;

        case "ORDER_CANCELLED" : {

          break;
        }
        case "TRADE_EXECUTED" : {

          break;
        }
      }
  } 
};

async function main() {
  console.log("dlq worker is running...");
  
  await createConsumerGroup();

  const prevMessages = await redisClient.xreadgroup(
    "GROUP",
    GROUP_NAME,
    CONSUMER_NAME,
    "STREAMS",
    DLQ_STREAM,
    "0"
  );

  if (prevMessages && prevMessages.length > 0) {
        const data = parseStreamData(prevMessages);
        await processEvents(data);
  }

  while (true) {
    try {
      const newMessages = await redisClient.xreadgroup(
        "GROUP",
        GROUP_NAME,
        CONSUMER_NAME,
        "BLOCK",
        5000,
        "STREAMS",
        DLQ_STREAM,
        ">"
      );

      if (newMessages && newMessages.length > 0) {
        const data = parseStreamData(prevMessages);
        await processEvents(data);
    }
    } catch (error) {
      console.error(error);
    }
  }
}

main();
