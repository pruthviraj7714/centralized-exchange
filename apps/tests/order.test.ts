import request from "supertest";
import { beforeEach, describe, expect, test } from "bun:test";
import prisma from "@repo/db";
import { addBalanceToUserWallet, BACKEND_URL, generateRandomUser } from "./utils";

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
        type : "LIMIT",
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
        type : "LIMIT",
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
        type : "LIMIT",
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
    await addBalanceToUserWallet("USDC", 200, jwt)
    const response = await request(BACKEND_URL)
      .post("/orders")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        side: "BUY",
        price: 180,
        quantity: 0.001,
        pair: "SOL-USDC",
        type : "LIMIT"
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
        type : "LIMIT"
      });
    expect(response.body.success).toBe(true);
    expect(response.statusCode).toBe(200);
    expect(response.body.requestId).toBeDefined();
  });
});
