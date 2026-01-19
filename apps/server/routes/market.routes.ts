import { Router } from "express";
import { fetchMarkets, getMarketBySymbol } from "../controller/market.controller";

const marketRouter = Router();

marketRouter.get("/", fetchMarkets);

marketRouter.get("/:symbol", getMarketBySymbol);

export default marketRouter;
