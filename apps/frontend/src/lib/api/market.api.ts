import { api } from "./axios"

const fetchMarkets = async () => {
    const { data } = await api.get("/markets")
    return data;
}

const fetchMarketData = async (ticker : string) => {
    const { data } = await api.get(`/markets/${ticker}`)
    return data;
}

const fetchMarketCandlesData = async (ticker : string, interval : string) => {
    const { data } = await api.get(`/candles?pair=${ticker}&interval=${interval}`)
    return data;
}


export { fetchMarkets, fetchMarketData, fetchMarketCandlesData }