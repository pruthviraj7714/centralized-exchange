import z from "zod";

export const OrderSchema = z.object({
  pair: z.string(),
  side: z.enum(["BUY", "SELL"]),
  price: z.number(),
  quantity: z.number(),
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
  "BTC-USDT",
  "BTC-USDC",
  "ETH-USDT",
  "ETH-USDC",
  "SOL-USDT",
  "SOL-USDC",
  "ETH-BTC",
  "SOL-BTC",
  "SOL-ETH",
  "USDC-USDT",
];

export const SEED_MARKETS = [
  {
    ticker: "BTC-USDT",
    baseAsset: "BTC",
    quoteAsset: "USDT",
    symbol: "BTCUSDT",
    logo: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", 
  },
  {
    ticker: "BTC-USDC",
    baseAsset: "BTC",
    quoteAsset: "USDC",
    symbol: "BTCUSDC",
    logo: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", 
  },
  {
    ticker: "ETH-USDT",
    baseAsset: "ETH",
    quoteAsset: "USDT",
    symbol: "ETHUSDT",
    logo: "https://assets.coingecko.com/coins/images/1/large/ethereum.png", 
  },
  {
    ticker: "ETH-USDC",
    baseAsset: "ETH",
    quoteAsset: "USDC",
    symbol: "ETHUSDC",
    logo: "https://assets.coingecko.com/coins/images/1/large/ethereum.png", 
  },
  {
    ticker: "SOL-USDT",
    baseAsset: "SOL",
    quoteAsset: "USDT",
    symbol: "SOLUSDT",
    logo: "https://assets.coingecko.com/coins/images/1/large/solana.png", 
  },
  {
    ticker: "SOL-USDC",
    baseAsset: "SOL",
    quoteAsset: "USDC",
    symbol: "SOLUSDC",
    logo: "https://assets.coingecko.com/coins/images/1/large/solana.png", 
  },
  {
    ticker: "ETH-BTC",
    baseAsset: "ETH",
    quoteAsset: "BTC",
    symbol: "ETHBTC",
    logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  },
  {
    ticker: "SOL-BTC",
    baseAsset: "SOL",
    quoteAsset: "BTC",
    symbol: "SOLBTC",
    logo: "https://cryptologos.cc/logos/solana-sol-logo.png",
  },
  {
    ticker: "SOL-ETH",
    baseAsset: "SOL",
    quoteAsset: "ETH",
    symbol: "SOLETH",
    logo: "https://cryptologos.cc/logos/solana-sol-logo.png",
  },
  {
    ticker: "USDC-USDT",
    baseAsset: "USDC",
    quoteAsset: "USDT",
    symbol: "USDCUSDT",
    logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  },
];
