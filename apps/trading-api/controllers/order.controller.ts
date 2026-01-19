import { OrderSchema } from "@repo/common";
import { formatValidationError } from "../utils";
import type { Request, Response } from "express";

const placeOrderController = (req: Request, res: Response) => {
    try {
        const validationResult = OrderSchema.safeParse(req.body);

        if (!validationResult.success) {
            res.status(400).json({
                message: "Invalid Schema",
                error: formatValidationError(validationResult.error)
            });
            return;
        }

        const { pair, price, quantity, side, type } = validationResult.data;

        //TODO

        res.status(200).json({
            message: "Order successfully Initiated"
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

const cancelOrderController = (req: Request, res: Response) => {
    try {

        const orderId = req.params.id as string;


        res.status(200).json({
            message: "Order Cancelled Successfully"
        })
    } catch (error) {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

export {
    placeOrderController,
    cancelOrderController
}