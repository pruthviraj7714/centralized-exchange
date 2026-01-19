import type { Request, Response } from "express";
import prisma from "@repo/db";

 const fetchMarkets = async (req : Request, res : Response) => {
    try {
      const markets = await prisma.market.findMany({});
  
      res.status(200).json({ markets: markets || [] });
    } catch (error) {
      res.status(500).json({
        message: "Internal Server Error",
      });
    }
  }

 const getMarketBySymbol = async  (req : Request, res : Response) => {
    try {
        const symbol = req.params.symbol;

        const market = await prisma.market.findFirst({
            where : {
                symbol
            }
        });

        res.status(200).json(market)
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error",
          });
    }
}

export {
    fetchMarkets,
    getMarketBySymbol
}