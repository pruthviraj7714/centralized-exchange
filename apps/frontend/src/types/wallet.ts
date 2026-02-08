import Decimal from "decimal.js";

export interface IBalance {
    asset: string;
    available: Decimal;
    locked: Decimal;
    usdValue: Decimal;
    change24h: Decimal;
    }
