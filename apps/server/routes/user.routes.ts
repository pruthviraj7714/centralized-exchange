import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import { fetchUserBalancesController, fetchUserPortfolio } from "../controller/users.controller";

const usersRouter = Router();

usersRouter.get('/balances', authMiddleware, fetchUserBalancesController)

usersRouter.get('/portfolio', authMiddleware, fetchUserPortfolio)

export default usersRouter;