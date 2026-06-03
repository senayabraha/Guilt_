import { supabase } from "../supabase";
import { mapOrder } from "./mappers";
import type { Order } from "../../types";

const ORDER_FULL =
  "*, store:stores(*), delivery_partner:delivery_partners(*), user:profiles(id, name, email, phone)";

// Hide unpaid card orders (checkout abandoned before payment).
const PAID_OR_NOT_CARD = "payment_method.neq.card,is_paid.eq.true";

// Cash/test checkout. Validates, creates the order, and decrements stock via
// the place_order RPC (security definer). Returns the new order id.
export async function placeOrder(params: {
  items: { product: string; quantity: number }[];
  shippingAddress: any;
}): Promise<string> {
  const { data, error } = await supabase.rpc("place_order", {
    cart: params.items,
    shipping: params.shippingAddress ?? {},
  });
  if (error) throw error;
  return data as string;
}

export async function getMyOrders(status?: string): Promise<Order[]> {
  let query = supabase
    .from("orders")
    .select("*, store:stores(*), delivery_partner:delivery_partners(*)")
    .or(PAID_OR_NOT_CARD);
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, store:stores(*), delivery_partner:delivery_partners(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapOrder(data) : null;
}

export async function getOrderLocation(
  id: string,
): Promise<{ liveLocation: any; status: string } | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("live_location, status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? { liveLocation: data.live_location, status: data.status } : null;
}

// Vendor: orders for a given store.
export async function getStoreOrders(
  storeId: string,
  status?: string,
): Promise<Order[]> {
  let query = supabase
    .from("orders")
    .select(ORDER_FULL)
    .eq("store_id", storeId)
    .or(PAID_OR_NOT_CARD);
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

// Admin: all (non-abandoned) orders.
export async function getAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_FULL)
    .or(PAID_OR_NOT_CARD)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

async function appendHistory(id: string, status: string, note?: string) {
  const { data } = await supabase
    .from("orders")
    .select("status_history")
    .eq("id", id)
    .maybeSingle();
  const history = Array.isArray(data?.status_history)
    ? data!.status_history
    : [];
  history.push({
    status,
    note: note || `Order ${status.toLowerCase()}`,
    timestamp: new Date().toISOString(),
  });
  return history;
}

export async function updateOrderStatus(
  id: string,
  status: string,
  note?: string,
): Promise<Order> {
  const history = await appendHistory(id, status, note);
  const { data, error } = await supabase
    .from("orders")
    .update({ status, status_history: history })
    .eq("id", id)
    .select(ORDER_FULL)
    .single();
  if (error) throw error;
  return mapOrder(data);
}

// Admin: assign a delivery partner (generates an OTP and advances status).
export async function assignDeliveryPartner(
  orderId: string,
  partnerId: string,
): Promise<void> {
  const { data: order } = await supabase
    .from("orders")
    .select("status, status_history")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error("Order not found");

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  let status = order.status;
  const history = Array.isArray(order.status_history)
    ? order.status_history
    : [];

  if (order.status === "Placed" || order.status === "Confirmed") {
    status = "Assigned";
    history.push({
      status: "Assigned",
      note: "Assigned to delivery partner",
      timestamp: new Date().toISOString(),
    });
  }

  const { error } = await supabase
    .from("orders")
    .update({
      delivery_partner_id: partnerId,
      delivery_otp: otp,
      status,
      status_history: history,
    })
    .eq("id", orderId);
  if (error) throw error;
}
