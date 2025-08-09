import z from "zod";


export const OrderSchema = z.object({
    pair : z.string(),
    side : z.enum(["BUY", "SELL"]),
    price : z.number(),
    quantity : z.number(),
    type: z.enum(["LIMIT", "MARKET"])
})