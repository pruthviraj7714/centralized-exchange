import { Router} from "express";
import { placeOrderController } from "../controllers/order.controller";

const orderRouter = Router();

orderRouter.post('/', placeOrderController)

export default orderRouter;