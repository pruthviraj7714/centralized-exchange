import type { Request, Response } from "express";
import prisma from "@repo/db";
import { SUPPORTED_TOKENS } from "@repo/common";
import Decimal from "decimal.js";

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

        if (!asset || !amount || new Decimal(amount).lte(0)) {
            res.status(400).json({
                message: "Invalid Inputs"
            });
            return;
        }

        const isValidAsset = SUPPORTED_TOKENS.some(t => t.symbol === asset);

        if (!isValidAsset) {
            res.status(400).json({
                message: "Unsupported asset"
            })
            return;
        }

        const wallet = await prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.upsert({
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
            });

            await tx.walletLedger.create({
                data: {
                    amount,
                    entryType: "DEPOSIT",
                    balanceType: "AVAILABLE",
                    direction: "CREDIT",
                    balanceBefore: wallet.available,
                    balanceAfter: wallet.available.plus(amount),
                    walletId: wallet.id,
                    referenceId: "",
                    referenceType: "DEPOSIT",
                }
            })

            return wallet;
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

const fetchWalletTransactions = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;

        const ledgers = await prisma.walletLedger.findMany({
            where: {
                wallet: {
                    userId
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            include: {
                wallet: {
                    select: {
                        userId: true
                    }
                }
            }
        })

        res.status(200).json({
            ledgers
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
    depositFunds,
    fetchWalletTransactions
}