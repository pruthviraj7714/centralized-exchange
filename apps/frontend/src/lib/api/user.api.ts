import { api } from "./axios"


const requestOTP = async (email: string) => {
    const { data } = await api.post('/auth/request-otp', {
        email
    });

    return data;
}

const fetchPortfolio = async (token: string) => {
    const { data } = await api.get('/users/portfolio', {
        headers : {
            Authorization : `Bearer ${token}`
        }
    });
    return data;
}

const fetchUserBalanceForMarket = async (ticker : string, token : string) => {
    const { data } = await api.get(`/users/balances?market=${ticker}`, {
        headers : {
            Authorization : `Bearer ${token}`
        }
    })
    return data;
}

const fetchUserOpenOrders = async (marketId : string, token : string) => {
    const { data } = await api.get(`/users/orders?market=${marketId}`, {
        headers : {
            Authorization : `Bearer ${token}`
        }
    })
    return data;
}

const fetchUserOrdersHistory = async (marketId : string, token : string) => {
    const { data } = await api.get(`/users/orders-history?market=${marketId}`, {
        headers : {
            Authorization : `Bearer ${token}`
        }
    })
    return data;
}

const fetchUserTrades = async (marketId : string, token : string) => {
    const { data } = await api.get(`/users/trades?market=${marketId}`, {
        headers : {
            Authorization : `Bearer ${token}`
        }
    })
    return data;
}

export { requestOTP, fetchPortfolio, fetchUserBalanceForMarket, fetchUserOpenOrders, fetchUserOrdersHistory, fetchUserTrades }