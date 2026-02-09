import Decimal from "decimal.js";

export interface IBalance {
    asset: string;
    available: Decimal;
    locked: Decimal;
    usdValue: Decimal;
    change24h: Decimal;
}

export interface IUserBalancesData {
    baseAssetWallet: {
        id: string,
        userId: string,
        asset: string,
        available: Decimal,
        locked: Decimal
    },
    quoteAssetWallet: {
        id: string,
        userId: string,
        asset: string,
        available: Decimal,
        locked: Decimal
    }
}
