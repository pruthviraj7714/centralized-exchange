import request from "supertest";
import { beforeEach, describe, expect, test } from "bun:test";
import prisma from "@repo/db";
import redisClient from "@repo/redisclient";

const BACKEND_URL = "http://localhost:3001";

beforeEach(async () => {
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();
});


const generateRandomUser = async () => {
    const response = await request(BACKEND_URL).post('/auth/request-otp').send({
        email : 'tony@gmail.com'
    })

    const otp = await redisClient.get(`OTP:${response.body.id}`);

    const response1 = await request(BACKEND_URL).post('/auth/verify-otp').send({
        email : 'tony@gmail.com',
        otp : parseInt(otp!)
    })

    return {
        userId : response.body.id,
        jwt : response1.body.jwt
    }
}

describe("depositing assets", () => {
    test("deposit 1 SOL", async () => {
        const { jwt } = await generateRandomUser();
        const response = await request(BACKEND_URL).post('/wallets/deposit').set("authorization", `Bearer ${jwt}`).send({
            asset : "SOL",
            amount : 1
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        const response1 = await request(BACKEND_URL).get('/wallets').set('authorization', `Bearer ${jwt}`)
        expect(response1.body.wallets).toBeArray();
        const btcWallet = response1.body.wallets.find((w : {asset : string, balance : number}) => w.asset === "SOL");
        expect(btcWallet.balance).toBe(1);
    })
    test("deposit 0.0001 BTC & checking balance", async () => {
        const { jwt } = await generateRandomUser();
        const response = await request(BACKEND_URL).post('/wallets/deposit').set("authorization", `Bearer ${jwt}`).send({
            asset : "BTC",
            amount : 0.0001
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);

        const response1 = await request(BACKEND_URL).get('/wallets').set('authorization', `Bearer ${jwt}`)
        expect(response1.body.wallets).toBeArray();
        const btcWallet = response1.body.wallets.find((w : {asset : string, balance : number}) => w.asset === "BTC");
        expect(btcWallet.balance).toBe(0.0001);
    })
})


describe("fetching user balance", () => {
    test('fetching user balance', async() => {
        const {jwt} = await generateRandomUser()
        const response = await request(BACKEND_URL).get('/wallets').set('authorization', `Bearer ${jwt}`)
        expect(response.statusCode).toBe(200);
    })
})