import type { NextFunction, Request, Response } from "express";
import { verify, type JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "../utils/config";


const authMiddleware = (req : Request, res : Response, next : NextFunction) => {
    try {
        const headers = req.headers.authorization;

        const token = headers?.split(" ")[1];

        if(!token) {
            res.status(400).json({
                message : "jwt token not found or malformed!"
            });
            return;
        }

        const isVerified = verify(token, JWT_SECRET) as JwtPayload;

        if(isVerified) {
            req.userId = isVerified.sub;
            next();
        }
        
    } catch (error) {
        res.status(403).json({
            message : "Unauthorized"
        })
    }



}

export default authMiddleware;