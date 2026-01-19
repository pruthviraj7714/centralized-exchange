import { Router } from "express";
import rateLimiter from "../middlewares/rateLimiter";
import { requestOTPController, verifyOTPController } from "../controller/auth.controller";

const authRouter: Router = Router();

authRouter.post(
  "/request-otp",
  rateLimiter,
  requestOTPController
);

authRouter.post(
  "/verify-otp",
  rateLimiter,
  verifyOTPController
);

export default authRouter;
