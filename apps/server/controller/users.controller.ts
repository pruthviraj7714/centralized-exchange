import { SUPPORTED_MARKETS } from "@repo/common";
import type { Request, Response } from "express"
import prisma from "@repo/db"
import Decimal from "decimal.js";
import { ORDER_STATUS } from "@repo/db/generated/prisma/enums";

const fetchUserBalancesController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const market = req.query.market as string;

        const isValidMarket = SUPPORTED_MARKETS.includes(market as typeof SUPPORTED_MARKETS[number]);

        if (!isValidMarket) {
            return res.status(400).json({
                message: "Invalid Market"
            })
        }

        const [baseAsset, quoteAsset] = market.split("-");

        const baseAssetWallet = await prisma.wallet.findUnique({
            where: {
                userId_asset: {
                    userId,
                    asset: baseAsset!
                }
            }
        });

        const quoteAssetWallet = await prisma.wallet.findUnique({
            where: {
                userId_asset: {
                    userId,
                    asset: quoteAsset!
                }
            }
        })

        res.status(200).json({
            baseAssetWallet,
            quoteAssetWallet
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const fetchUserPortfolio = async (req: Request, res: Response) => {
    try {

        const userId = req.userId!;

        const wallets = await prisma.wallet.findMany({
            where: {
                userId,
                OR: [
                    {
                        available: {
                            gt: 0
                        }
                    },
                    {
                        locked: {
                            gt: 0
                        }
                    }
                ]
            }
        });

        const usdPriceMap: Record<string, Decimal> = {};

        const markets = await prisma.market.findMany({
            select: {
                symbol: true,
                price: true,
                change24h: true
            }
        });


        markets.forEach(market => {
            const baseAsset = market.symbol.split("-")[0];
            usdPriceMap[baseAsset as string] = market.price!;
        });

        const portfolio = wallets.map(wallet => {
            return {
                asset: wallet.asset,
                available: wallet.available,
                locked: wallet.locked,
                usdValue: wallet.asset === "USDC" ? wallet.available.mul(new Decimal(1)) : wallet.available.mul(usdPriceMap[wallet.asset] || new Decimal(0)),
                change24h: markets.find(m => m.symbol === wallet.asset)?.change24h || new Decimal(0)
            }
        });

        res.status(200).json({
            portfolio
        });

    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const fetchUserOrders = async (req: Request, res: Response) => {
    try {
        const { market } = req.query;

        if (!market) {
            return res.status(400).json({
                message: "Market is required"
            })
        }
        const userId = req.userId!;

        const orders = await prisma.order.findMany({
            where: {
                userId,
                marketId: market as string,
                OR: [
                    { status: ORDER_STATUS.OPEN },
                    { status: ORDER_STATUS.PARTIALLY_FILLED }
                ]
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        res.status(200).json(
            orders
        );
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }


}

const fetchUserOrdersHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;

        const { market } = req.query;

        if (!market) {
            return res.status(400).json({
                message: "Market is required"
            })
        }

        const orders = await prisma.order.findMany({
            where: {
                userId,
                marketId: market as string,
                OR: [
                    {
                        status: ORDER_STATUS.FILLED
                    },
                    {
                        status: ORDER_STATUS.CANCELLED
                    }
                ]
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        res.status(200).json(
            orders
        );

    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }


}

const fetchUserTrades = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const market = req.query.market as string;

        if (!market) {
            return res.status(400).json({
                message: "Market is required"
            })
        }

        const trades = await prisma.trade.findMany({
            where: {
                OR: [
                    {
                        makerId: userId
                    },
                    {
                        takerId: userId
                    }
                ],
                marketId: market as string
            },
            orderBy: {
                executedAt: "desc"
            }
        });

        res.status(200).json(trades);
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

export {
    fetchUserBalancesController,
    fetchUserPortfolio,
    fetchUserOrders,
    fetchUserOrdersHistory,
    fetchUserTrades
}