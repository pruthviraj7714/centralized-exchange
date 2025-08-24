import { Router, type Request, type Response } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import prisma from "@repo/db";
import { DefaultAssets } from "../utils/constants";

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
        available : true,
      }
    });

    res.status(200).json({
      wallets : wallets.map(w => ({
        asset : w.asset,
        balance : w.available
      })),
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
    try {
      
      const userId = req.userId!;
  
      const { asset, amount } = req.body;
      
      if(!asset || typeof amount !== "number" || !amount || amount <= 0) {
          res.status(400).json({
              message : "Invalid Inputs"
          });
          return;
      }
  
      if(!DefaultAssets.includes(asset)) {
        res.status(400).json({
          message : "Unsupported asset"
        })
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
              available : amount,
              userId
          },
          update : {
            available : {
                  increment : amount
              }
          }
      })
  
      res.status(200).json({
          success : true,
          id : wallet.id,
          message : `${amount} ${asset} successfully deposited`
      })
    } catch (error) {
      console.log(error);
      
  res.status(500).json({
    message : "Internal Server Error"
  })      
    }


  }
);

export default walletsRouter;
