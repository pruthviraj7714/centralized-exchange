
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

export type ITickerData = {
  marketId: string,
  price: string,
  open24h: string,
  high24h : string,
  low24h: string,
  volume24h: string,
  quoteVolume24h: string,
  change24h: string,
  priceChange24h: string,
}