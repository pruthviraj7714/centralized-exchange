import request from "supertest";
import { beforeEach, describe, expect, test } from "bun:test";
import prisma from "@repo/db";
import { BACKEND_URL, generateRandomUser, placeRandomOrder } from "./utils";

beforeEach(async () => {
  await prisma.order.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
});

describe("adding order", () => {
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
        quantity: 10,
        pair: "BTC-USDC",
      });
    expect(response.statusCode).toBe(400);
  });
  test("It should fail for invalid or 0 quantity", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/orders")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        side: "BUY",
        price: 10,
        quantity: 0,
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
    const response = await request(BACKEND_URL)
      .post("/orders")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        side: "BUY",
        price: 10,
        quantity: 0.001,
        pair: "SOL-USDC",
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.id).toBeDefined();
  });
  test("0.0001 BTC-USDC for 1", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/orders")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        side: "BUY",
        price: 1,
        quantity: 0.0001,
        pair: "BTC-USDC",
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.id).toBeDefined();
  });
});

describe("fetching order", () => {
  test("fetching user orders with no pair in query - 1", async () => {
    const { jwt } = await generateRandomUser();
    await placeRandomOrder(jwt);

    const response = await request(BACKEND_URL)
      .get("/orders")
      .set("authorization", `Bearer ${jwt}`);

    expect(response.body.buyOrders).toBeDefined();
    expect(response.body.sellOrders).toBeDefined();
  });
  test("fetching user orders with no pair in query - 2", async () => {
    const { jwt } = await generateRandomUser();
    const order = await placeRandomOrder(jwt);

    const response = await request(BACKEND_URL)
      .get("/orders")
      .set("authorization", `Bearer ${jwt}`);

    expect(response.body.buyOrders).toBeArray();
    expect(response.body.sellOrders).toBeArray();

    if (order.side === "BUY") {
      expect(response.body.buyOrders).toBeArrayOfSize(1);
    } else {
      expect(response.body.sellOrders).toBeArrayOfSize(1);
    }
  });
  test("fetching user orders with pair query", async () => {
    const { jwt } = await generateRandomUser();
    const order = await placeRandomOrder(jwt, "SOL-USDC");

    const response = await request(BACKEND_URL)
      .get(`/orders?pair=SOL-USDC`)
      .set("authorization", `Bearer ${jwt}`);

    expect(response.body.pair).toBe("SOL-USDC");
    if (order.side === "BUY") {
      expect(response.body.buyOrders).toBeArrayOfSize(1);
    } else {
      expect(response.body.sellOrders).toBeArrayOfSize(1);
    }
  });
  test("fetching user orders - multiple order", async () => {
    const { jwt } = await generateRandomUser();

    const orders = await Promise.all(
      Array.from({ length: 10 }).map((_) => placeRandomOrder(jwt))
    );

    const response = await request(BACKEND_URL)
      .get(`/orders`)
      .set("authorization", `Bearer ${jwt}`);

    const buyOrders = orders.filter((o) => o.side === "BUY");
    const sellOrders = orders.filter((o) => o.side === "SELL");

    expect(response.body.buyOrders.length).toBe(buyOrders.length);
    expect(response.body.sellOrders.length).toBe(sellOrders.length);
  });
  test("fetching user orders - multiple order", async () => {
    const { jwt } = await generateRandomUser();

    const orders = await Promise.all(
      Array.from({ length: 100 }).map((_) => placeRandomOrder(jwt))
    );

    const response = await request(BACKEND_URL)
      .get(`/orders`)
      .set("authorization", `Bearer ${jwt}`);

    const buyOrders = orders.filter((o) => o.side === "BUY");
    const sellOrders = orders.filter((o) => o.side === "SELL");

    expect(response.body.buyOrders.length).toBe(buyOrders.length);
    expect(response.body.sellOrders.length).toBe(sellOrders.length);
  });
});

describe("cancelling orders", () => {
  test("cancelling user order", async () => {
    const { jwt } = await generateRandomUser();
    const order = await placeRandomOrder(jwt, "SOL-USDC");

    const response = await request(BACKEND_URL)
      .delete(`/orders/${order.id}`)
      .set("authorization", `Bearer ${jwt}`);

    expect(response.statusCode).toBe(200);
  });
  test("cancelling user order actual checking in db", async () => {
    const { jwt } = await generateRandomUser();
    const order = await placeRandomOrder(jwt);

    await request(BACKEND_URL)
      .delete(`/orders/${order.id}`)
      .set("authorization", `Bearer ${jwt}`);

    const o = await prisma.order.findUnique({
      where: {
        id: order.id,
      },
    });

    expect(o?.status).toBe("CANCELLED");
  });
});
