

export interface IMarketData {
  id: string;
  price: string;
  ticker: string;
  logo: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  volume24h: string | null;
  marketCap: string | null;
  change24h: string | null;
  sparkline7d: string[];
  createdAt: Date;
  updatedAt: Date;
  high24h: string,
  low24h: string,
  open24h: string,
  priceChange: string,
  minOrderSize: string,
  maxOrderSize: string,
  tickSize: string,
  lotSize: string,
  isActive: boolean,
  isFeatured: boolean,
}

export interface IUpdatedMarketData {
    lastPrice: string;
    change: string;
    changePercent: string;
    high: string;
    low: string;
    volume: string;
}
