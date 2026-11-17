export const isPickup = (order) => order?.fulfillmentType === "pickup";

export function orderStatusKey(order, status = order?.status) {
  if (isPickup(order) && status === "onTheWay") return "readyForPickup";
  if (isPickup(order) && status === "delivered") return "collected";
  return status;
}
