import { SUPPORTED_MARKETS } from "@repo/common";
import type { Request, Response } from "express"
import prisma from "@repo/db"

const fetchUserBalancesController = async (req : Request, res : Response) => {
    try {
        const userId = req.userId!;
        const market = req.query.market as string;

        const isValidMarket = SUPPORTED_MARKETS.includes(market as typeof SUPPORTED_MARKETS[number]);

        if(!isValidMarket){
            return res.status(400).json({
                message : "Invalid Market"
            })
        }

        const [baseAsset, quoteAsset] = market.split("-");

       const baseAssetWallet = await prisma.wallet.findUnique({
        where : {
            userId_asset : {
                userId,
                asset : baseAsset!
            }
        }
       });

        const quoteAssetWallet = await prisma.wallet.findUnique({
            where : {
                userId_asset : {
                    userId,
                    asset : quoteAsset!
                }
            }
        })

        res.status(200).json({
            baseAssetWallet,
            quoteAssetWallet
        })
    } catch (error) {
        res.status(500).json({
            message : "Internal Server Error"
        })
    }
}

export {
    fetchUserBalancesController
}