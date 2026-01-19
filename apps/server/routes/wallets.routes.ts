import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware";
import { depositFunds, fetchLedgers, fetchWallets } from "../controller/wallet.controller";

const walletsRouter: Router = Router();

walletsRouter.get("/", authMiddleware, fetchWallets);

walletsRouter.get("/:asset/ledger", authMiddleware, fetchLedgers)

walletsRouter.post(
  "/deposit",
  authMiddleware,
  depositFunds
);

export default walletsRouter;
