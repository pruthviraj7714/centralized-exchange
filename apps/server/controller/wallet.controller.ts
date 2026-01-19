import type { Request, Response } from "express";
import prisma from "@repo/db";
import { DefaultAssets } from "../utils/constants";

const fetchLedgers = async (req: Request, res: Response) => {
    try {
        const asset = req.params.asset;
        const userId = req.userId!;

        const wallet = await prisma.wallet.findFirst({
            where: {
                userId,
                asset
            }
        });

        if (!wallet) {
            res.status(400).json({
                message: "Wallet for given asset not found"
            });
            return;
        }

        const ledgers = await prisma.walletLedger.findMany({
            where: {
                walletId: wallet.id
            }
        })

        res.status(200).json({
            ledgers
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const fetchWallets = async (req: Request, res: Response) => {
    const userId = req.userId!;

    try {
        const wallets = await prisma.wallet.findMany({
            where: {
                userId,
            },
            select: {
                asset: true,
                available: true,
                locked: true,
            }
        });

        res.status(200).json({
            wallets
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
}

const depositFunds = async (req: Request, res: Response) => {
    try {

        const userId = req.userId!;

        const { asset, amount } = req.body;

        if (!asset || typeof amount !== "number" || !amount || amount <= 0) {
            res.status(400).json({
                message: "Invalid Inputs"
            });
            return;
        }

        if (!DefaultAssets.includes(asset)) {
            res.status(400).json({
                message: "Unsupported asset"
            })
            return;
        }

        const wallet = await prisma.wallet.upsert({
            where: {
                userId_asset: {
                    asset,
                    userId
                }
            },
            create: {
                asset,
                available: amount,
                userId,
                locked: 0
            },
            update: {
                available: {
                    increment: amount
                }
            }
        })

        res.status(200).json({
            success: true,
            id: wallet.id,
            message: `${amount} ${asset} successfully deposited`
        })
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

export {
    fetchLedgers,
    fetchWallets,
    depositFunds
}