import prisma from "@repo/db";
import { Router } from "express";

const marketRouter = Router();

marketRouter.get("/all", async (req, res) => {
  try {
    const markets = await prisma.market.findMany({});

    res.status(200).json({ markets: markets || [] });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

export default marketRouter;
