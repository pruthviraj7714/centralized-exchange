import { RequestOTPSchema, VerifyOTPSchema } from "@repo/common";
import type { Request, Response } from "express";
import prisma from '@repo/db';
import { SUPPORTED_TOKENS } from "@repo/common";
import redisClient from "@repo/redisclient";
import Decimal from "decimal.js";
import { sign } from "jsonwebtoken";
import { JWT_SECRET } from "../utils/config";

const generateRandomOTP = () => {
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
};

const OTP_EXPIRATION_DURATION = 1 * 60 * 1000;

const requestOTPController = async (req: Request, res: Response) => {
    const { error, data } = RequestOTPSchema.safeParse(req.body);

    if (error) {
        res.status(400).json({
            message: "Email should be provided",
            error: error
        });
        return;
    }

    const { email } = data;

    try {
        const user = await prisma.user.upsert({
            where: {
                email,
            },
            create: {
                email,
            },
            update: {},
            select: {
                wallets: true,
                id: true,
            },
        });

        if (!user.wallets || user.wallets.length === 0) {
            await prisma.wallet.createMany({
                data: SUPPORTED_TOKENS.map((a) => ({
                    asset: a.symbol,
                    available: new Decimal(0),
                    locked: new Decimal(0),
                    userId: user.id,
                })),
            });
        }

        const alreadyOTPExists = await redisClient.get(`OTP:${user.id}`);

        if (alreadyOTPExists) {
            console.log(alreadyOTPExists);
            res.status(200).json({
                message: "OTP successfully sent!",
                id: user.id,
            });
            return;
        }
        const otp = generateRandomOTP();

        console.log("OTP:", otp);
        
        await redisClient.set(
            `OTP:${user.id}`,
            otp,
            "PX",
            OTP_EXPIRATION_DURATION
        );

        res.status(200).json({
            message: "OTP successfully sent!",
            id: user.id,
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

const verifyOTPController = async (req: Request, res: Response) => {
    try {
      const { error, data } = VerifyOTPSchema.safeParse(req.body);

      if(error) {
        res.status(400).json({
          message : error.message,
        });
        return;
      }

      const { otp, email } = data;

      const user = await prisma.user.findFirst({
        where: {
          email,
        },
      });

      if (!user) {
        res.status(400).json({
          message: "No user with given email found!",
        });
        return;
      }

      const userOTP = await redisClient.get(`OTP:${user.id}`);

      if (!userOTP) {
        res.status(400).json({
          message: "OTP might be expired",
        });
        return;
      }

      if (userOTP !== otp) {
        res.status(403).json({
          message: "wrong otp",
        });
        return;
      }

      await redisClient.del(`OTP:${user.id}`);

      const jwt = sign({ sub: user.id }, JWT_SECRET);

      res.status(200).json({
        message: "successfully verified otp",
        jwt,
        email : user.email,
        id : user.id,
        success: true,
      });
    } catch (error) {
      res.status(500).json({
        message: "Internal Server Error",
      });
    }
  }

export {
    requestOTPController,
    verifyOTPController
}