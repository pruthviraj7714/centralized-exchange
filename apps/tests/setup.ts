import prisma from "@repo/db";
import redisClient from "@repo/redisclient";
import { beforeEach } from "bun:test";

beforeEach(async () => {
  await redisClient.flushall();
  await prisma.order.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
});
