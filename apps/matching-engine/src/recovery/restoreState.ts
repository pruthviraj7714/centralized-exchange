import { SUPPORTED_MARKETS } from "@repo/common";
import { SnapshotService } from "../snapshotService";
import { MatchingEngineService } from "../MatchEngineService";
import { currentSequence, restoreSequence } from "../state/sequence";
import { restoreProcessedIds } from "../state/dedup";
import redisclient from "@repo/redisclient";

export async function restoreAllPairs(producer: any) {
  for (const market of SUPPORTED_MARKETS) {
    const snapshot = await SnapshotService.load(market);
    if (!snapshot) continue;

    MatchingEngineService.restoreOrderbook(snapshot, market);

    await restoreSequence(market);

    if (snapshot.processedEventIds) {
      restoreProcessedIds(snapshot.processedEventIds);
    }

    const orderbook = MatchingEngineService.getOrderbook(market);
    const lastTrades = MatchingEngineService.getRecentTrades(market);

    if (orderbook) {
      await redisclient.set(
        `snapshot:rendered:${market}`,
        JSON.stringify({
          bids: orderbook.bids,
          asks: orderbook.asks,
          sequence: currentSequence(market),
          lastTrades,
        }),
        "EX",
        3600,
      );
    }

    if (orderbook) {
      await producer.send({
        topic: "orderbook.snapshot",
        messages: [
          {
            value: JSON.stringify({
              event: "ORDERBOOK_SNAPSHOT",
              pair: market,
              bids: orderbook.bids,
              asks: orderbook.asks,
              updatedAt: Date.now(),
              eventId: crypto.randomUUID(),
              sequence: currentSequence(market),
            }),
            key: market,
          },
        ],
      });
    }
  }
}
