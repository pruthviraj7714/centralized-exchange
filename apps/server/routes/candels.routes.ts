import { Router } from "express";
import { getCandles } from "../controller/candel.controller";

const candelRouter = Router();

candelRouter.get("/", getCandles);

export default candelRouter;