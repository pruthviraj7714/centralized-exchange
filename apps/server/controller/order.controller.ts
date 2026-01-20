import type { Request, Response } from "express";
import { TRADING_API_SERVER_URL } from "../utils/config";
import prisma from '@repo/db';
import type { ORDER_STATUS } from "@repo/db/generated/prisma/enums";

const proxyToTradingAPIServer = async (req: Request, res: Response) => {
    try {
        const response = await fetch(`${TRADING_API_SERVER_URL}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId : req.userId!,
                ...req.body
            })
        });

        const data = await response.json();

        if (!response.ok) {
            res.status(response.status).json(data);
            return;
        }

        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Trading API Server Error: " + error
        });
    }
}

const proxyOrderCancelAPI = async (req: Request, res: Response) => {
    try {
        const orderId = req.params.id!;

        const response = await fetch(`${TRADING_API_SERVER_URL}/orders/${orderId}/cancel`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId : req.userId!,
                ...req.body
            })
        });

        const data = await response.json();

        if (!response.ok) {
            res.status(response.status).json(data);
            return;
        }

        res.status(200).json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Trading API Server Error: " + error
        });
    }
}

const fetchOrdersController = async (req: Request, res: Response) => {
    try {
        const userId = req.userId!;
        const symbol = req.query.symbol as string | undefined;
        const status = req.query.status as ORDER_STATUS | undefined;

        const orders = await prisma.order.findMany({
            where: {
                userId,
                ...(status && { status }),
                ...(symbol && {
                    market: {
                        symbol
                    }
                })
            },
            include: {
                market: true
            }
        });

        res.status(200).json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Trading API Server Error: " + error
        });
    }
}

const fetchOrderDetailsController = async (req: Request, res: Response) => {
    try {
        const orderId = req.params.id;
        const userId = req.userId!;

        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId
            }
        });

        if (!order) {
            res.status(400).json({
                message: "Order not found!"
            });
            return;
        }

        res.status(200).json({
            order
        })

    } catch (error) {
        res.status(500).json({
            message: "Trading API Server Error: " + error
        });
    }
}

export {
    proxyToTradingAPIServer,
    proxyOrderCancelAPI,
    fetchOrdersController,
    fetchOrderDetailsController
}