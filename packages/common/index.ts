import z from "zod";


export const OrderSchema = z.object({
    pair : z.string(),
    side : z.enum(["BUY", "SELL"]),
    price : z.number(),
    quantity : z.number(),
    type: z.enum(["LIMIT", "MARKET"])
})

export const RequestOTPSchema = z.object({
    email : z.email({error : "Please Provide a Valid Email"})
})

export const VerifyOTPSchema = z.object({
    email : z.email({error : "Please Provide a Valid Email"}),
    otp: z.string().length(6, { message: "Invalid OTP" })
})


export const SUPPORTED_MARKETS = [
    "BTC-USDT", "BTC-USDC",
    "ETH-USDT", "ETH-USDC", 
    "SOL-USDT", "SOL-USDC",
    "ETH-BTC",
    "SOL-BTC",
    "SOL-ETH",
    "USDC-USDT"
  ];