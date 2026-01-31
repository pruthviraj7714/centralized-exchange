import { api } from "./axios"

const fetchMarkets = async () => {
    const { data } = await api.get("/markets")
    return data;
}

const fetchMarketData = async (ticker : string) => {
    const { data } = await api.get(`/markets/${ticker}`)
    return data;
}

export { fetchMarkets, fetchMarketData }