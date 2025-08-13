import prisma from "@repo/db";
import redisClient from "@repo/redisclient";
import { beforeAll } from "bun:test";

beforeAll(async () => {
  await redisClient.flushall();
  await prisma.order.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
});
