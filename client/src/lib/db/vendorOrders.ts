import { supabase } from "../supabase";
import { mapOrder } from "./mappers";
import type { Order, OrderItem, OrderPrepStatus } from "../../types";

const VENDOR_ORDER_FULL =
  "*, store:stores(*), delivery_partner:delivery_partners(*), user:profiles(id, name, email, phone)";

type PrepUpdateOptions = {
  unavailableReason?: string;
};

const isHandled = (item: OrderItem) =>
  item.prepStatus === "picked" || item.prepStatus === "not_available";

const historyEntry = (status: string, note: string) => ({
  status,
  note,
  timestamp: new Date().toISOString(),
});

async function loadOrderRow(orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(VENDOR_ORDER_FULL)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Order not found or you do not have access.");
  return data;
}

async function updateStatusWithHistory(
  orderId: string,
  status: string,
  note: string,
): Promise<Order> {
  const order = await loadOrderRow(orderId);
  const history = Array.isArray(order.status_history)
    ? [...order.status_history]
    : [];
  history.push(historyEntry(status, note));

  const { data, error } = await supabase
    .from("orders")
    .update({ status, status_history: history })
    .eq("id", orderId)
    .select(VENDOR_ORDER_FULL)
    .single();
  if (error) throw error;
  return mapOrder(data);
}

export async function getVendorOrder(orderId: string): Promise<Order> {
  return mapOrder(await loadOrderRow(orderId));
}

export async function startPreparingOrder(orderId: string): Promise<Order> {
  return updateStatusWithHistory(
    orderId,
    "Preparing",
    "Store started preparing the order",
  );
}

export async function updateOrderItemPrepStatus(
  orderId: string,
  productId: string,
  prepStatus: Extract<OrderPrepStatus, "picked" | "not_available">,
  options: PrepUpdateOptions = {},
): Promise<Order> {
  const order = await loadOrderRow(orderId);
  const items = Array.isArray(order.items) ? order.items : [];
  let found = false;
  const preparedAt = new Date().toISOString();

  const updatedItems = items.map((item: OrderItem) => {
    if (String(item.product) !== productId) return item;
    found = true;
    const quantity = Number(item.quantity) || 0;
    return {
      ...item,
      prepStatus,
      pickedQuantity: prepStatus === "picked" ? quantity : 0,
      unavailableReason:
        prepStatus === "not_available" ? options.unavailableReason || "" : "",
      preparedAt,
    };
  });

  if (!found) throw new Error("Order item not found.");

  const { data, error } = await supabase
    .from("orders")
    .update({ items: updatedItems })
    .eq("id", orderId)
    .select(VENDOR_ORDER_FULL)
    .single();
  if (error) throw error;
  return mapOrder(data);
}

export async function completeOrderPreparation(orderId: string): Promise<Order> {
  const order = await loadOrderRow(orderId);
  const items = Array.isArray(order.items) ? order.items : [];

  if (items.length === 0 || !items.every(isHandled)) {
    throw new Error("Finish checking all items before completing preparation.");
  }

  const hasUnavailable = items.some(
    (item: OrderItem) => item.prepStatus === "not_available",
  );
  const status = hasUnavailable ? "Partially Available" : "Ready for Pickup";
  const note = hasUnavailable
    ? "Order preparation completed with unavailable items"
    : "Order is ready for delivery partner pickup";

  return updateStatusWithHistory(orderId, status, note);
}

export async function confirmReadyForPickup(orderId: string): Promise<Order> {
  return updateStatusWithHistory(
    orderId,
    "Ready for Pickup",
    "Order is ready for delivery partner pickup",
  );
}
