import type { Request, Response } from "express";
import prisma from '@repo/db';

const fetchUserTradesController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;

        const trades = await prisma.trade.findMany({
            where: {
                OR: [
                    {
                        buyOrder: {
                            userId
                        }
                    },
                    {
                        sellOrder: {
                            userId
                        }
                    },
                ]
            },
            include: {
                buyOrder: {
                    select: {
                        userId: true
                    }
                },
                sellOrder: {
                    select: {
                        userId: true
                    }
                }
            },
            orderBy: {
                executedAt: "desc"
            }
        });

        res.status(200).json({ trades })
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const fetchMarketTradesForSymbolController = async (req: Request, res: Response) => {
    try {
        const symbol = req.params.symbol;

        if (!symbol) {
            return res.status(400).json({ message: "Symbol is required" });
        }

        const trades = await prisma.trade.findMany({
            where: {
                market: {
                    symbol
                }
            },
            include: {
                market: {
                    select: {
                        symbol: true
                    }
                }
            },
            orderBy: {
                executedAt: "desc"
            }
        });

        res.status(200).json({ trades })
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

export {
    fetchUserTradesController,
    fetchMarketTradesForSymbolController
}