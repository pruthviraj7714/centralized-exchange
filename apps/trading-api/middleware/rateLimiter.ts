import redisClient from "@repo/redisclient";
import type { NextFunction, Request, Response } from "express";

const RATE_LIMIT_EXPIRE_DURATION = 5 * 60 * 1000;

const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const userIp = req.ip;

  if(process.env.NODE_ENV !== "PRODUCTION") {
    next();
    return;
  }

  try {
    const requests = await redisClient.incr(`IP:${userIp}`);

    if (requests === 1) {
      await redisClient.expire(`IP:${userIp}`, RATE_LIMIT_EXPIRE_DURATION);
    } else if (requests >= 3) {
      res.status(409).json({
        message: "Too many requestes! Please try again after 5 minutes",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export default rateLimiter;
