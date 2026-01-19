import { Router} from "express";
import { cancelOrderController, placeOrderController } from "../controllers/order.controller";

const orderRouter = Router();

orderRouter.post('/', placeOrderController);

orderRouter.post('/:id/cancel', cancelOrderController);

export default orderRouter;