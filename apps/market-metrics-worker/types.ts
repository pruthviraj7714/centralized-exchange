
export type TradeEvent = {
  buyOrderId: string,
  sellOrderId: string,
  price: string,
  quantity: string,
  marketId: string,
  pair: string,
  timestamp: number,
  event: "TRADE_EXECUTED",
  executedAt: number,
}