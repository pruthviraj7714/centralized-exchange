import redisClient from "@repo/redisclient";
import request from "supertest";

export const BACKEND_URL = "http://localhost:3001";

const SUPPORTED_PAIRS = [
  "BTC-SOL",
  "BTC-USDT",
  "BTC-USDC",
  "BTC-ETH",
  "SOL-BTC",
  "SOL-USDT",
  "SOL-USDC",
  "SOL-ETH",
  "USDT-BTC",
  "USDT-SOL",
  "USDT-USDC",
  "USDT-ETH",
  "USDC-BTC",
  "USDC-SOL",
  "USDC-USDT",
  "USDC-ETH",
  "ETH-BTC",
  "ETH-SOL",
  "ETH-USDT",
  "ETH-USDC",
];

export const generateRandomUser = async () => {
  const randomNumber = Math.floor(Math.random() * 100 + 1);
  const response = await request(BACKEND_URL)
    .post("/auth/request-otp")
    .send({
      email: `tony${randomNumber}@gmail.com`,
    });

  const otp = await redisClient.get(`OTP:${response.body.id}`);

  const response1 = await request(BACKEND_URL)
    .post("/auth/verify-otp")
    .send({
      email: `tony${randomNumber}@gmail.com`,
      otp: parseInt(otp!),
    });

  return {
    userId: response.body.id,
    jwt: response1.body.jwt,
  };
};

export const placeRandomOrder = async (jwt: string, pair?: string | null) => {
  const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const sides = ["BUY", "SELL"];
  const side = sides[Math.floor(Math.random() * sides.length)];
  const randomPair = pair
    ? pair
    : SUPPORTED_PAIRS[Math.floor(Math.random() * SUPPORTED_PAIRS.length)];
  const price = randomInt(1, 1000);
  const quantity = randomInt(1, 1000);
  const types = ["LIMIT", "MARKET"];
  const type = types[Math.floor(Math.random() * types.length)];
  const response = await request(BACKEND_URL)
    .post("/orders")
    .set("authorization", `Bearer ${jwt}`)
    .send({
      side,
      price,
      type,
      quantity,
      pair: randomPair,
    });

  return {
    id: response.body.id,
    side,
  };
};

export const addBalanceToUserWallet = async (
  asset: string,
  amount: number,
  jwt: string
) => {
  await request(BACKEND_URL)
    .post("/wallets/deposit")
    .set("authorization", `Bearer ${jwt}`)
    .send({
      asset,
      amount,
    });
};
