import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import { fetchOrderDetailsController, fetchOrdersController, proxyOrderCancelAPI, proxyToTradingAPIServer } from "../controller/order.controller";

const orderRouter: Router = Router();

orderRouter.post("/",authMiddleware, proxyToTradingAPIServer);

orderRouter.post("/:id/cancel", authMiddleware, proxyOrderCancelAPI);

orderRouter.get('/', authMiddleware, fetchOrdersController);

orderRouter.get('/:id', authMiddleware, fetchOrderDetailsController);

export default orderRouter;
