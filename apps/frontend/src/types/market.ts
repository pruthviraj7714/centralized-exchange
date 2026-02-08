

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
}