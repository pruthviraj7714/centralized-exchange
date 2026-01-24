import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import { fetchUserBalancesController } from "../controller/users.controller";

const usersRouter = Router();

usersRouter.get('/balances', authMiddleware, fetchUserBalancesController)

export default usersRouter;