export const COMMAND_TOPICS = {
  ORDER_CREATE: "orders.create",
  ORDER_CANCEL: "orders.cancel"
} as const;

export const EVENT_TOPICS = {
  TRADE_EXECUTED: "trades.executed",
  ORDER_OPENED: "orders.opened",
  ORDER_UPDATED: "orders.updated",
  ORDER_CANCELLED: "orders.cancelled",
  ORDER_EXPIRED: "orders.expired",
  ORDERBOOK_UPDATE: "orderbook.updated",
} as const;
