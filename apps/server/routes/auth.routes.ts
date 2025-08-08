import { Router, type Request, type Response } from "express";
import redisClient from '@repo/redisclient';

const authRouter : Router = Router();


authRouter.post('/request-otp', async (req : Request, res : Response) => {


})

authRouter.post('/verify-otp', (req : Request, res : Response) => {

})


export default authRouter;

