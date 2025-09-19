import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import prisma from "@repo/db";

const klinesRouter = Router();

const getCandleView = (interval: string): string => {
  switch (interval) {
    case "1m":
      return "candle_1m";
    case "5m":
      return "candle_5m";
    case "15m":
      return "candle_15m";
    case "30m":
        return "candle_30m";
    case "1h":
      return "candle_1h";
    case "4h":
      return "candle_4h";
    case "1d":
      return "candle_1d";
    default:
      throw new Error("Invalid interval");
  }
};

klinesRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const { symbol, interval, startTime, endTime, limit } = req.query;

    if (!symbol || !interval) {
      return res.status(400).json({
        message: "Symbol and Interval must be passed in params",
      });
    }

    const viewName = getCandleView(interval as string);

    const end = endTime ? new Date(Number(endTime)) : new Date();
    const start = startTime
      ? new Date(Number(startTime))
      : new Date(end.getTime() - 60 * 60 * 1000);

    const maxLimit = 1000;
    const rowsLimit = limit ? Math.min(Number(limit), maxLimit) : 500;

    const candles: any = await prisma.$queryRawUnsafe(
      `
        SELECT bucket, pair, open, high, low, close, volume
        FROM "${viewName}"
        WHERE pair = $1
          AND bucket >= $2::timestamptz
          AND bucket <= $3::timestamptz
        ORDER BY bucket ASC
        LIMIT $4;
      `,
      symbol,
      start,
      end,
      rowsLimit
    );

    const formattedCandles = candles.map((c: any) => ([
      new Date(c.bucket).getTime(), 
      Number(c.open),
      Number(c.high),
      Number(c.low),
      Number(c.close),
      Number(c.volume ?? 0)
    ]));

    return res.status(200).json(formattedCandles);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});


export default klinesRouter;
