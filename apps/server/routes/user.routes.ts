import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import { fetchUserBalancesController, fetchUserOrders, fetchUserOrdersHistory, fetchUserPortfolio, fetchUserTrades } from "../controller/users.controller";

const usersRouter = Router();

usersRouter.get('/balances', authMiddleware, fetchUserBalancesController)

usersRouter.get('/portfolio', authMiddleware, fetchUserPortfolio)

usersRouter.get('/orders', authMiddleware, fetchUserOrders);

usersRouter.get('/orders-history', authMiddleware, fetchUserOrdersHistory);

usersRouter.get('/trades', authMiddleware, fetchUserTrades);

export default usersRouter;