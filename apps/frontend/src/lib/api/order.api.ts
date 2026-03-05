import { api } from "./axios";
import { PlaceOrderPayload } from "@/types/order";

const placeOrder = async (orderPayload: PlaceOrderPayload) => {
  const { data } = await api.post(
    "/orders",
    {
      pair: orderPayload.ticker,
      side: orderPayload.side,
      price: orderPayload.price,
      quantity: orderPayload.quantity,
      type: orderPayload.type,
      quoteAmount: orderPayload.quoteAmount,
      clientOrderId: orderPayload.clientOrderId,
    },
    {
      headers: {
        Authorization: `Bearer ${orderPayload.token}`,
      },
    },
  );

  return data;
};

const cancelOrder = async (orderId: string, token: string) => {
  const { data } = await api.delete(`/orders/${orderId}/cancel`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data;
};

export { placeOrder, cancelOrder };
