import request from "supertest";
import { beforeEach, describe, expect, test } from "bun:test";
import prisma from "@repo/db";
import redisClient from "@repo/redisclient";
import { BACKEND_URL } from "./utils";

beforeEach(async () => {
  await prisma.order.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
});

describe("request otp endpoints", () => {
  test("failure test", async () => {
    const response = await request(BACKEND_URL)
      .post("/auth/request-otp")
      .send({});
    expect(response.statusCode).toBe(400);
  });
  test("success", async () => {
    const response = await request(BACKEND_URL).post("/auth/request-otp").send({
      email: "test@gmail.com",
    });
    expect(response.statusCode).toBe(200);
    expect(response.body.id).toBeDefined();
  });
});

describe("otp verification endpoint", () => {
  test("it should return 400 if not user with given email found", async () => {
    const response = await request(BACKEND_URL).post("/auth/verify-otp").send({
      email: "test@gmail.com",
      otp: 111111,
    });
    expect(response.statusCode).toBe(400);
  });
  test("it should return 403 if wrong otp given", async () => {
    const response1 = await request(BACKEND_URL)
      .post("/auth/request-otp")
      .send({
        email: "test@gmail.com",
      });

    const otp = await redisClient.get(`OTP:${response1.body.id}`);

    const wrongOTP =
      parseInt(otp!) !== 222222 ? 222222 : 222111;
    const response2 = await request(BACKEND_URL).post("/auth/verify-otp").send({
      email: "test@gmail.com",
      otp: wrongOTP,
    });
    expect(response2.statusCode).toBe(403);
  });
  test("it should return 200 status code & jwt if right otp given", async () => {
    const response1 = await request(BACKEND_URL)
      .post("/auth/request-otp")
      .send({
        email: "test@gmail.com",
      });

    const otp = await redisClient.get(`OTP:${response1.body.id}`);
  
    const response2 = await request(BACKEND_URL).post("/auth/verify-otp").send({
      email: "test@gmail.com",
      otp: parseInt(otp!),
    });
    expect(response2.statusCode).toBe(200);
    expect(response2.body.success).toBe(true);
    expect(response2.body.jwt).toBeDefined();
  });
});
