import { Router, type Request, type Response } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import prisma from "@repo/db";

const walletsRouter: Router = Router();

walletsRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const wallets = await prisma.wallet.findMany({
      where: {
        userId,
      },
      select : {
        asset : true,
        balance : true,
      }
    });

    res.status(200).json({
      wallets,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
});

walletsRouter.post(
  "/deposit",
  authMiddleware,
  async (req: Request, res: Response) => {
    const userId = req.userId!;

    const { asset, amount } = req.body;
    
    if(!asset || typeof amount !== "number" || !amount || amount <= 0) {
        res.status(400).json({
            message : "Invalid Inputs"
        });
        return;
    }

    const wallet = await prisma.wallet.upsert({
        where : {
            userId_asset : {
                asset,
                userId
            }
        },
        create : {
            asset,
            balance : amount,
            userId
        },
        update : {
            balance : {
                increment : amount
            }
        }
    })

    res.status(200).json({
        success : true,
        id : wallet.id,
        message : `${amount} ${asset} successfully deposited`
    })


  }
);

export default walletsRouter;
