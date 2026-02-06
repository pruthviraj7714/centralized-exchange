import { Router} from "express";
import { cancelOrderController, placeOrderController } from "../controllers/order.controller";
import rateLimiter from "../middleware/rateLimiter";

const orderRouter = Router();

orderRouter.post('/', rateLimiter, placeOrderController);

orderRouter.delete('/:id/cancel', cancelOrderController);

export default orderRouter;