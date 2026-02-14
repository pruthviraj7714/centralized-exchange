
export interface ITrade {
  id: string;
  marketId: string;
  buyOrderId: string;
  sellOrderId: string;
  makerId: string;
  takerId: string;
  price: string;
  quantity: string;
  makerFee: string;
  takerFee: string;
  executedAt: string;
}

export interface TradeData {
  buyOrderId: string;
  sellOrderId: string;
  price: string;
  quantity: string;
  pair: string;
  timestamp: number;
}
