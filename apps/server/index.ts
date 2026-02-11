import express from 'express'
import authRouter from './routes/auth.routes';
import walletsRouter from './routes/wallets.routes';
import orderRouter from './routes/order.routes';
import marketRouter from './routes/market.routes';
import usersRouter from './routes/user.routes';
import candlesRouter from './routes/candels.routes';
import cors from 'cors';
import { PORT } from './utils/config';

const app = express();

app.use(express.json());
app.use(cors());

app.get('/', (req,res) => {
    res.status(200).json({
        message : "Healthy Server"
    })
})

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/markets', marketRouter);
app.use('/wallets', walletsRouter);
app.use('/orders', orderRouter);
app.use('/candles', candlesRouter);

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
})