import Decimal from "decimal.js";
import { api } from "./axios";

const placeOrder = async (ticker: string, side: "BUY" | "SELL", price: Decimal, quantity: Decimal, type: "LIMIT" | "MARKET", token: string) => {
    const { data } = await api.post('/orders', {
        pair: ticker,
        side,
        price,
        quantity,
        type
    }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    return data;
}

export { placeOrder }