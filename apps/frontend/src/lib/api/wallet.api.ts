import Decimal from "decimal.js";
import { api } from "./axios";


const depositAsset = async (asset : string, amount : Decimal, token : string) => {
    const { data } = await api.post('/wallets/deposit', {
          asset,
          amount,
    }, {
        headers : {
            Authorization : `Bearer ${token}`
        }
    })
    return data;
}

const fetchWalletTransactions = async (token : string, page : number = 1, limit : number = 10) => {
    const { data } = await api.get(`/wallets/transactions?limit=${limit}&page=${page}`, {
        headers : {
            Authorization : `Bearer ${token}`
        }
    })
    return data;
}

export { depositAsset, fetchWalletTransactions }