import "./test-setup";
import request from "supertest";
import { describe, expect, test } from "bun:test";
import redisClient from "@repo/redisclient";
import { BACKEND_URL } from "./utils";

describe("POST /auth/request-otp", () => {
  test("should return 400 when email is missing", async () => {
    const response = await request(BACKEND_URL)
      .post("/auth/request-otp")
      .send({});
    expect(response.statusCode).toBe(400);
  });
  test("should return 200 and OTP request ID for valid email", async () => {
    const response = await request(BACKEND_URL).post("/auth/request-otp").send({
      email: "noexistsemail@gmail.com",
    });
    expect(response.statusCode).toBe(200);
    expect(response.body.id).toBeDefined();
  });
});

describe("POST /auth/verify-otp", () => {
  test("should return 400 when user with given email does not exist", async () => {
    const response = await request(BACKEND_URL).post("/auth/verify-otp").send({
      email: "test@gmail.com",
      otp: 111111,
    });
    expect(response.statusCode).toBe(400);
  });
  test("should return 403 when OTP is incorrect", async () => {
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
  test("should return 200 and JWT token when OTP is correct", async () => {
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
