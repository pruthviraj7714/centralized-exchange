import { Router, type Request, type Response } from "express";
import authMiddleware from "../middlewares/authMiddleware";


const walletsRouter : Router = Router();



walletsRouter.get('/', authMiddleware, (req  : Request, res : Response) => {
    
})

walletsRouter.post('/deposit', authMiddleware, (req : Request, res : Response) => {
    
})

export default walletsRouter;