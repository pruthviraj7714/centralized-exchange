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

export { depositAsset }