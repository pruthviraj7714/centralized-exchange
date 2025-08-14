import "./test-setup";
import request from "supertest";
import { describe, expect, test } from "bun:test";
import {
  addBalanceToUserWallet,
  BACKEND_URL,
  generateRandomUser,
  placeRandomOrder,
  waitForOrderCancelUpdate,
  waitForOrderUpdate,
  waitForStatus,
} from "./utils";
import prisma from "@repo/db";

describe("Order Placement API", () => {
  test("It should fail for invalid inputs", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/orders")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        side: "LOL",
        price: 0,
        quantity: 1000,
        pair: "BTC-BTC",
      });
    expect(response.statusCode).toBe(400);
  });
  test("It should fail for invalid or 0 price", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/orders")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        side: "BUY",
        price: 0,
        type: "LIMIT",
        quantity: 10,
        pair: "BTC-USDC",
      });
    expect(response.statusCode).toBe(400);
  });
  test("It should fail for invalid or 0 quantity for limit orders", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/orders")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        side: "BUY",
        price: 10,
        quantity: 0,
        type: "LIMIT",
        pair: "BTC-USDC",
      });
    expect(response.statusCode).toBe(400);
  });
  test("It should fail for wrong or invalid side", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/orders")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        side: "LOL",
        price: 10,
        type: "LIMIT",
        quantity: 1,
        pair: "BTC-USDC",
      });
    expect(response.statusCode).toBe(400);
  });
  test("It should fail if no type is provided", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/orders")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        side: "LOL",
        price: 10,
        quantity: 1,
        pair: "BTC-USDC",
      });
    expect(response.statusCode).toBe(400);
  });
  test("It should fail for unsupported pairs", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/orders")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        side: "BUY",
        price: 10,
        quantity: 1,
        pair: "BTC-BTC",
      });
    expect(response.statusCode).toBe(400);
  });
  test("It should successed if right data passed", async () => {
    const { jwt } = await generateRandomUser();
    await addBalanceToUserWallet("USDC", 200, jwt);
    const response = await request(BACKEND_URL)
      .post("/orders")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        side: "BUY",
        price: 180,
        quantity: 0.001,
        pair: "SOL-USDC",
        type: "LIMIT",
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.requestId).toBeDefined();
  });
  test("0.0001 BTC-USDC for 1", async () => {
    const { jwt } = await generateRandomUser();
    await addBalanceToUserWallet("USDC", 1000, jwt);
    const response = await request(BACKEND_URL)
      .post("/orders")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        side: "BUY",
        price: 1,
        quantity: 0.0001,
        pair: "BTC-USDC",
        type: "LIMIT",
      });
    expect(response.body.success).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.body.requestId).toBeDefined();
  });
});

describe("Fetching User Open Orders API", () => {
  test("GET /orders → should return 1 SOL-USDC LIMIT BUY order", async () => {
    const { jwt } = await generateRandomUser();
    await addBalanceToUserWallet("USDC", 1200, jwt);
    await placeRandomOrder(jwt, "SOL-USDC", "BUY", "LIMIT");
    await waitForOrderUpdate(jwt, 5000, 200, "BUY", 1, "SOL-USDC");
    const response = await request(BACKEND_URL)
      .get(`/orders?pair=SOL-USDC`)
      .set("authorization", `Bearer ${jwt}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.buyOrders).toBeArrayOfSize(1);
  });
  test("GET /orders → should return 1 ETH-USDC LIMIT SELL order", async () => {
    const { jwt } = await generateRandomUser();
    await addBalanceToUserWallet("ETH", 5000, jwt);
    await placeRandomOrder(jwt, "ETH-USDC", "SELL", "LIMIT");
    await waitForOrderUpdate(jwt, 5000, 200, "SELL", 1, "ETH-USDC");
    const response = await request(BACKEND_URL)
      .get(`/orders?pair=ETH-USDC`)
      .set("authorization", `Bearer ${jwt}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.sellOrders).toBeArrayOfSize(1);
  });
  test("GET /orders → should return 1 BTC-USDC LIMIT BUY order", async () => {
    const { jwt } = await generateRandomUser();
    await addBalanceToUserWallet("USDC", 5000, jwt);
    await placeRandomOrder(jwt, "BTC-USDC", "BUY", "LIMIT");
    await waitForOrderUpdate(jwt, 5000, 200, "BUY", 1, "BTC-USDC");
    const response = await request(BACKEND_URL)
      .get(`/orders?pair=BTC-USDC`)
      .set("authorization", `Bearer ${jwt}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.buyOrders).toBeArrayOfSize(1);
  });
  test("GET /orders → should return 3 BTC-USDC LIMIT BUY orders", async () => {
    const { jwt } = await generateRandomUser();
    await addBalanceToUserWallet("USDC", 5000, jwt);

    await Promise.all(
      Array.from({ length: 3 }).map(async (_) => {
        await placeRandomOrder(jwt, "BTC-USDC", "BUY", "LIMIT");
      })
    );
    await waitForOrderUpdate(jwt, 5000, 200, "BUY", 3, "BTC-USDC");

    const response = await request(BACKEND_URL)
      .get(`/orders?pair=BTC-USDC`)
      .set("authorization", `Bearer ${jwt}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.buyOrders).toBeArrayOfSize(3);
  });
  test("GET /orders → should return 5 SOL-USDC LIMIT SELL orders", async () => {
    const { jwt } = await generateRandomUser();
    await addBalanceToUserWallet("SOL", 5000, jwt);

    await Promise.all(
      Array.from({ length: 5 }).map(async (_) => {
        await placeRandomOrder(jwt, "SOL-USDC", "SELL", "LIMIT");
      })
    );
    await waitForOrderUpdate(jwt, 5000, 200, "SELL", 5, "SOL-USDC");

    const response = await request(BACKEND_URL)
      .get(`/orders?pair=SOL-USDC`)
      .set("authorization", `Bearer ${jwt}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.sellOrders).toBeArrayOfSize(5);
  });
});

describe("Order Cancellation API", () => {
  test("should cancel a 1 SOL-USDC LIMIT BUY order and update DB + API response", async () => {
    const { jwt } = await generateRandomUser();
    await addBalanceToUserWallet("USDC", 1200, jwt);
    const { id } = await placeRandomOrder(jwt, "SOL-USDC", "BUY", "LIMIT");
    await waitForOrderUpdate(jwt, 5000, 200, "BUY", 1, "SOL-USDC");
    const res = await request(BACKEND_URL)
      .get(`/orders?pair=SOL-USDC`)
      .set("authorization", `Bearer ${jwt}`);

    const orderId = res.body.buyOrders[0].id;

    const response = await waitForOrderCancelUpdate(jwt, 5000, 200, orderId);

    await waitForStatus(orderId, "CANCELLED");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("CANCELLED");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Order successfully cancelled");
  });
  test("should cancel a 1 ETH-USDC LIMIT SELL order and update DB + API response", async () => {
    const { jwt } = await generateRandomUser();
    await addBalanceToUserWallet("ETH", 1200, jwt);
    await placeRandomOrder(jwt, "ETH-USDC", "SELL", "LIMIT");
    await waitForOrderUpdate(jwt, 5000, 200, "SELL", 1, "ETH-USDC");
    const res = await request(BACKEND_URL)
      .get(`/orders?pair=ETH-USDC`)
      .set("authorization", `Bearer ${jwt}`);

    const orderId = res.body.sellOrders[0].id;

    const response = await waitForOrderCancelUpdate(jwt, 5000, 200, orderId);

    await waitForStatus(orderId, "CANCELLED");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("CANCELLED");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Order successfully cancelled");
  });
  test("should cancel a 1 BTC-USDC LIMIT BUY order and update DB + API response", async () => {
    const { jwt } = await generateRandomUser();
    await addBalanceToUserWallet("USDC", 1200, jwt);
    await placeRandomOrder(jwt, "BTC-USDC", "BUY", "LIMIT");
    await waitForOrderUpdate(jwt, 5000, 200, "BUY", 1, "BTC-USDC");
    const res = await request(BACKEND_URL)
      .get(`/orders?pair=BTC-USDC`)
      .set("authorization", `Bearer ${jwt}`);

    const orderId = res.body.buyOrders[0].id;

    const response = await waitForOrderCancelUpdate(jwt, 5000, 200, orderId);

    await waitForStatus(orderId, "CANCELLED");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("CANCELLED");

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Order successfully cancelled");
  });
});
