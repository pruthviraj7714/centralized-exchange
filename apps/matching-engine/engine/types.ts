import type Decimal from "decimal.js"

type EngineOrder = {
    id: string
    userId: string
    side: "BUY" | "SELL"
    price: Decimal | null
    quantity: Decimal
    filled: Decimal
    createdAt: number
  }
  
  type Trade = {
    buyOrderId: string
    sellOrderId: string
    price: Decimal
    quantity: Decimal
    timestamp: number
  }