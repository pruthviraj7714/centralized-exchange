import express from 'express'
import authRouter from './routes/auth.routes';
import walletsRouter from './routes/wallets.routes';

const app = express();

app.use(express.json());

app.get('/', (req,res) => {
    res.status(200).json({
        message : "Healthy Server"
    })
})

app.use('/auth', authRouter);
app.use('/wallets', walletsRouter);


app.listen(3001, () => {
    console.log("server is running on port 3001");
})