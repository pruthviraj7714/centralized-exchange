

export const INTERVALS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;
export type ChartInterval = (typeof INTERVALS)[number];