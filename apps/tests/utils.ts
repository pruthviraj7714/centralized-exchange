import prisma from "@repo/db";
import redisClient from "@repo/redisclient";
import request, { type Response } from "supertest";

export const BACKEND_URL = "http://localhost:3001";

type ORDER_STATUS = "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED";

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
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const email = `tony${uniqueId}@gmail.com`;

  const response = await request(BACKEND_URL).post("/auth/request-otp").send({
    email,
  });

  const otp = await redisClient.get(`OTP:${response.body.id}`);

  const response1 = await request(BACKEND_URL).post("/auth/verify-otp").send({
    email,
    otp,
  });

  return {
    userId: response.body.id,
    jwt: response1.body.jwt,
  };
};

export const placeRandomOrder = async (
  jwt: string,
  pair?: string | null,
  iSide?: "BUY" | "SELL",
  iType?: "LIMIT" | "MARKET"
) => {
  const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const sides = ["BUY", "SELL"];
  const side = iSide ? iSide : sides[Math.floor(Math.random() * sides.length)];
  const randomPair = pair
    ? pair
    : SUPPORTED_PAIRS[Math.floor(Math.random() * SUPPORTED_PAIRS.length)];
  const price = randomInt(1, 10);
  const quantity = randomInt(1, 10);
  const types = ["LIMIT", "MARKET"];
  const type = iType ? iType : types[Math.floor(Math.random() * types.length)];
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

export async function waitForOrderUpdate(
  jwt: string,
  timeoutMs = 5000,
  intervalMs = 200,
  side: "BUY" | "SELL",
  numOrders: number = 1,
  pair?: string
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const response = await request(BACKEND_URL)
      .get(`/orders${pair ? `?pair=${pair}` : ""}`)
      .set("authorization", `Bearer ${jwt}`);

    if (
      response.statusCode === 200 &&
      (side === "BUY"
        ? Array.isArray(response.body.buyOrders) &&
          response.body.buyOrders.length === numOrders
        : Array.isArray(response.body.sellOrders) &&
          response.body.sellOrders.length === numOrders)
    ) {
      return;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Timed out waiting for order to be updated in DB");
}

export async function waitForOrderCancelUpdate(
  jwt: string,
  timeoutMs = 5000,
  intervalMs = 200,
  orderId: string
): Promise<Response> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const response = await request(BACKEND_URL)
      .delete(`/orders/${orderId}`)
      .set("authorization", `Bearer ${jwt}`);

    if (response.statusCode === 200) {
      return response;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("Timed out waiting for order to be updated in DB");
}

export async function waitForStatus(
  orderId: string,
  status: ORDER_STATUS,
  timeout = 5000,
  interval = 200
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order?.status === status) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Order did not reach status ${status} in time`);
}
