import "./test-setup";
import request from "supertest";
import { describe, expect, test } from "bun:test";
import { BACKEND_URL, generateRandomUser } from "./utils";

describe("depositing assets", () => {
  test("should fail for unsupported assets", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/wallets/deposit")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        asset: "NONE",
        amount: 0.0001,
      });
    expect(response.statusCode).toBe(400);
  });
  test("should fail for invalid deposit amount", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/wallets/deposit")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        asset: "NONE",
        amount: "w32fca",
      });
    expect(response.statusCode).toBe(400);
  });
  test("should fail for negative deposit amount", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/wallets/deposit")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        asset: "BTC",
        amount: -23,
      });
    expect(response.statusCode).toBe(400);
  });
  test("should fail for 0 deposit amount", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/wallets/deposit")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        asset: "SOL",
        amount: 0,
      });
    expect(response.statusCode).toBe(400);
  });
  test("should return 403 for unauthorized user", async () => {
    const response = await request(BACKEND_URL)
      .post("/wallets/deposit")
      .set("authorization", `Bearer wefaw23dwa2`)
      .send({
        asset: "SOL",
        amount: 1,
      });
    expect(response.statusCode).toBe(403);
  });
  test("deposit 1 SOL", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/wallets/deposit")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        asset: "SOL",
        amount: 1,
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    const response1 = await request(BACKEND_URL)
      .get("/wallets")
      .set("authorization", `Bearer ${jwt}`);
    expect(response1.body.wallets).toBeArray();
    const btcWallet = response1.body.wallets.find(
      (w: { asset: string; balance: number }) => w.asset === "SOL"
    );
    expect(btcWallet.balance).toBe(1);
  });
  test("deposit 0.0001 BTC & checking balance", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .post("/wallets/deposit")
      .set("authorization", `Bearer ${jwt}`)
      .send({
        asset: "BTC",
        amount: 0.0001,
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const response1 = await request(BACKEND_URL)
      .get("/wallets")
      .set("authorization", `Bearer ${jwt}`);
    expect(response1.body.wallets).toBeArray();
    const btcWallet = response1.body.wallets.find(
      (w: { asset: string; balance: number }) => w.asset === "BTC"
    );
    expect(btcWallet.balance).toBe(0.0001);
  });
});

describe("Fetching User Balance API", () => {
  test("GET /wallets → should return 403 for unauthorized token", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .get("/wallets")
      .set("authorization", `Bearer 23qff34`);
    expect(response.statusCode).toBe(403);
  });
  test("GET /wallets → should return 200 for authorized user", async () => {
    const { jwt } = await generateRandomUser();
    const response = await request(BACKEND_URL)
      .get("/wallets")
      .set("authorization", `Bearer ${jwt}`);
    expect(response.statusCode).toBe(200);
  });
});
