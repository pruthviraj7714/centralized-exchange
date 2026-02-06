import Decimal from "decimal.js";
import { api } from "./axios";

const placeOrder = async (ticker: string, side: "BUY" | "SELL", type: "LIMIT" | "MARKET", token: string, quantity?: Decimal, quoteAmount?: Decimal, price?: Decimal) => {
    const { data } = await api.post('/orders', {
        pair: ticker,
        side,
        price,
        quantity,
        type,
        quoteAmount
    }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    return data;
}

const cancelOrder = async (orderId : string, token : string) => {
    const { data } = await api.delete(`/orders/${orderId}/cancel`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    return data;
}

export { placeOrder, cancelOrder }