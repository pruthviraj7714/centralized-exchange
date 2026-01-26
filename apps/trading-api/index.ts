import express, { type Request, type Response } from 'express';
import { PORT } from './config';
import cors from 'cors';
import orderRouter from './routes/order.routes';
import rateLimiter from './middleware/rateLimiter';

const app = express();

app.use(express.json())
app.use(cors({
    origin: process.env.SERVER_URL || "http://localhost:3001",
}));

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: "OK",
        uptime: process.uptime(),
    })
})

app.use('/orders', rateLimiter, orderRouter);

app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`);
})