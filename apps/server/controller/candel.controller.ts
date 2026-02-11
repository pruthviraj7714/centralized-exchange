import type { Request, Response } from "express";
import prisma from '@repo/db';

const getCandles = async (req: Request, res: Response) => {
  try {
    const {
      pair,
      interval,
      limit = "100"
    } = req.query;

    if (!pair || !interval) {
      res.status(400).json({
        message: "pair and interval required"
      });
      return;
    }

    const candles = await prisma.candle.findMany({
      where: {
        market: pair as string,
        interval: interval as string
      },
      orderBy: {
        openTime: "asc"
      },
      take: Number(limit)
    })

    return res.status(200).json(candles.map((candle) => ({
      openTime: new Date(candle.openTime).getTime(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      tradeCount: candle.tradeCount
    })));

  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
}


export { getCandles }