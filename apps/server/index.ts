import express from 'express'
import authRouter from './routes/auth.routes';
import walletsRouter from './routes/wallets.routes';
import orderRouter from './routes/order.routes';
import marketRouter from './routes/market.routes';
import cors from 'cors';
import klinesRouter from './routes/klines.routes';
const app = express();

app.use(express.json());
app.use(cors());

app.get('/', (req,res) => {
    res.status(200).json({
        message : "Healthy Server"
    })
})

app.use('/auth', authRouter);
app.use('/wallets', walletsRouter);
app.use('/orders', orderRouter);
app.use('/market', marketRouter);
app.use('/klines', klinesRouter);


app.listen(3001, () => {
    console.log("server is running on port 3001");
})