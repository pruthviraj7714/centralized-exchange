import Decimal from "decimal.js";
import z from "zod";

export const OrderSchema = z.object({
  pair: z.string(),
  side: z.enum(["BUY", "SELL"]),
  price: z.string().transform((val) => new Decimal(val)).optional(),
  quantity: z.string().transform((val) => new Decimal(val)).optional(),
  quoteAmount : z.string().transform((val) => new Decimal(val)).optional(),
  type: z.enum(["LIMIT", "MARKET"]),
});

export const RequestOTPSchema = z.object({
  email: z.email({ error: "Please Provide a Valid Email" }),
});

export const VerifyOTPSchema = z.object({
  email: z.email({ error: "Please Provide a Valid Email" }),
  otp: z.string().length(6, { message: "Invalid OTP" }),
});

export const SUPPORTED_MARKETS = [
  "BTC-USDC",
  "ETH-USDC",
  "SOL-USDC",
  "BNB-USDC",
  "XRP-USDC",
  "ADA-USDC",
  "AVAX-USDC",
  "DOGE-USDC",
  "MATIC-USDC",
  "DOT-USDC",
] as const;

export const SUPPORTED_TOKENS = [
  {symbol: "BTC", name: "Bitcoin"},
  {symbol: "ETH", name: "Ethereum"},
  {symbol: "SOL", name: "Solana"},
  {symbol: "USDC", name: "USD Coin"},
  {symbol: "BNB", name: "BNB"},
  {symbol: "XRP", name: "XRP"},
  {symbol: "ADA", name: "Cardano"},
  {symbol: "AVAX", name: "Avalanche"},
  {symbol: "DOGE", name: "Dogecoin"},
  {symbol: "MATIC", name: "Polygon"},
  {symbol: "DOT", name: "Polkadot"},
] as const;

export const TOKEN_METADATA = {
  BTC: {
    name: "Bitcoin",
    symbol: "BTC",
    logo: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
    decimals: 8,
    color: "#F7931A",
  },
  ETH: {
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    decimals: 18,
    color: "#627EEA",
  },
  SOL: {
    name: "Solana",
    symbol: "SOL",
    logo: "https://cryptologos.cc/logos/solana-sol-logo.png",
    decimals: 9,
    color: "#14F195",
  },
  USDC: {
    name: "USD Coin",
    symbol: "USDC",
    logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
    decimals: 6,
    color: "#2775CA",
  },
  BNB: {
    name: "BNB",
    symbol: "BNB",
    logo: "https://cryptologos.cc/logos/bnb-bnb-logo.png",
    decimals: 18,
    color: "#F3BA2F",
  },
  XRP: {
    name: "Ripple",
    symbol: "XRP",
    logo: "https://cryptologos.cc/logos/xrp-xrp-logo.png",
    decimals: 6,
    color: "#23292F",
  },
  ADA: {
    name: "Cardano",
    symbol: "ADA",
    logo: "https://cryptologos.cc/logos/cardano-ada-logo.png",
    decimals: 6,
    color: "#0033AD",
  },
  AVAX: {
    name: "Avalanche",
    symbol: "AVAX",
    logo: "https://cryptologos.cc/logos/avalanche-avax-logo.png",
    decimals: 18,
    color: "#E84142",
  },
  DOGE: {
    name: "Dogecoin",
    symbol: "DOGE",
    logo: "https://cryptologos.cc/logos/dogecoin-doge-logo.png",
    decimals: 8,
    color: "#C2A633",
  },
  MATIC: {
    name: "Polygon",
    symbol: "MATIC",
    logo: "https://cryptologos.cc/logos/polygon-matic-logo.png",
    decimals: 18,
    color: "#8247E5",
  },
  DOT: {
    name: "Polkadot",
    symbol: "DOT",
    logo: "https://cryptologos.cc/logos/polkadot-new-dot-logo.png",
    decimals: 10,
    color: "#E6007A",
  },
} as const;

export const SEED_MARKETS = [
  {
    ticker: "BTC-USDC",
    baseAsset: "BTC",
    quoteAsset: "USDC",
    symbol: "BTCUSDC",
    name: "Bitcoin",
    logo: TOKEN_METADATA.BTC.logo,
    minOrderSize: 0.0001,
    maxOrderSize: 1000,
    tickSize: 0.01,
    lotSize: 0.00001,
  },
  {
    ticker: "ETH-USDC",
    baseAsset: "ETH",
    quoteAsset: "USDC",
    symbol: "ETHUSDC",
    name: "Ethereum",
    logo: TOKEN_METADATA.ETH.logo,
    minOrderSize: 0.001,
    maxOrderSize: 10000,
    tickSize: 0.01,
    lotSize: 0.0001,
  },
  {
    ticker: "SOL-USDC",
    baseAsset: "SOL",
    quoteAsset: "USDC",
    symbol: "SOLUSDC",
    name: "Solana",
    logo: TOKEN_METADATA.SOL.logo,
    minOrderSize: 0.01,
    maxOrderSize: 100000,
    tickSize: 0.01,
    lotSize: 0.001,
  },
  {
    ticker: "BNB-USDC",
    baseAsset: "BNB",
    quoteAsset: "USDC",
    symbol: "BNBUSDC",
    name: "BNB",
    logo: TOKEN_METADATA.BNB.logo,
    minOrderSize: 0.01,
    maxOrderSize: 10000,
    tickSize: 0.01,
    lotSize: 0.001,
  },
  {
    ticker: "XRP-USDC",
    baseAsset: "XRP",
    quoteAsset: "USDC",
    symbol: "XRPUSDC",
    name: "Ripple",
    logo: TOKEN_METADATA.XRP.logo,
    minOrderSize: 1,
    maxOrderSize: 1000000,
    tickSize: 0.0001,
    lotSize: 0.1,
  },
  {
    ticker: "ADA-USDC",
    baseAsset: "ADA",
    quoteAsset: "USDC",
    symbol: "ADAUSDC",
    name: "Cardano",
    logo: TOKEN_METADATA.ADA.logo,
    minOrderSize: 1,
    maxOrderSize: 1000000,
    tickSize: 0.0001,
    lotSize: 0.1,
  },
  {
    ticker: "AVAX-USDC",
    baseAsset: "AVAX",
    quoteAsset: "USDC",
    symbol: "AVAXUSDC",
    name: "Avalanche",
    logo: TOKEN_METADATA.AVAX.logo,
    minOrderSize: 0.1,
    maxOrderSize: 100000,
    tickSize: 0.01,
    lotSize: 0.01,
  },
  {
    ticker: "DOGE-USDC",
    baseAsset: "DOGE",
    quoteAsset: "USDC",
    symbol: "DOGEUSDC",
    name: "Dogecoin",
    logo: TOKEN_METADATA.DOGE.logo,
    minOrderSize: 1,
    maxOrderSize: 10000000,
    tickSize: 0.00001,
    lotSize: 0.1,
  },
  {
    ticker: "MATIC-USDC",
    baseAsset: "MATIC",
    quoteAsset: "USDC",
    symbol: "MATICUSDC",
    name: "Polygon",
    logo: TOKEN_METADATA.MATIC.logo,
    minOrderSize: 1,
    maxOrderSize: 1000000,
    tickSize: 0.0001,
    lotSize: 0.1,
  },
  {
    ticker: "DOT-USDC",
    baseAsset: "DOT",
    quoteAsset: "USDC",
    symbol: "DOTUSDC",
    name: "Polkadot",
    logo: TOKEN_METADATA.DOT.logo,
    minOrderSize: 0.1,
    maxOrderSize: 100000,
    tickSize: 0.001,
    lotSize: 0.01,
  },
];

export const fetchMarketMetadata = (ticker: string) => {
  const marketData = SEED_MARKETS.find((market) => market.ticker === ticker);
  return marketData;
};
export const getTokenMetadata = (symbol: string) => {
  return TOKEN_METADATA[symbol as keyof typeof TOKEN_METADATA];
};

export const getMarketsForToken = (token: string) => {
  return SEED_MARKETS.filter(
    (market) => market.baseAsset === token || market.quoteAsset === token
  );
};

export const isMarketSupported = (ticker: string) => {
  return SUPPORTED_MARKETS.includes(ticker as any);
};

export const FEE_CONFIG = {
  maker: 0.001, 
  taker: 0.001, 
  withdrawal: {
    BTC: 0.0005,
    ETH: 0.005,
    SOL: 0.01,
    USDC: 1,
    BNB: 0.01,
    XRP: 0.25,
    ADA: 1,
    AVAX: 0.01,
    DOGE: 5,
    MATIC: 1,
    DOT: 0.1,
  },
} as const;

export const ORDER_LIMITS = {
  minNotional: 10, 
  maxNotional: 1000000, 
} as const;

export type SupportedMarket = typeof SUPPORTED_MARKETS[number];
export type SupportedToken = typeof SUPPORTED_TOKENS[number];
export type MarketData = typeof SEED_MARKETS[number];
export type TokenMetadata = typeof TOKEN_METADATA[keyof typeof TOKEN_METADATA];