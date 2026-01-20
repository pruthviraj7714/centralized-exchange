import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import { fetchMarketTradesForSymbolController, fetchUserTradesController } from "../controller/trade.controller";

const tradeRouter = Router();

tradeRouter.post('/', authMiddleware, fetchUserTradesController);

tradeRouter.get('/markets/:symbol', authMiddleware, fetchMarketTradesForSymbolController);

export default tradeRouter;