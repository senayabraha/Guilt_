import { supabase } from "../supabase";
import type { Notification } from "../../types";

type NotificationRow = {
  id: string;
  user_id: string;
  audience: Notification["audience"];
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

const mapNotification = (row: NotificationRow): Notification => ({
  id: row.id,
  userId: row.user_id,
  audience: row.audience,
  type: row.type,
  title: row.title,
  message: row.message,
  entityType: row.entity_type,
  entityId: row.entity_id,
  readAt: row.read_at,
  createdAt: row.created_at,
});

export async function getMyNotifications(limit = 20): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as NotificationRow[]).map(mapNotification);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export async function notifyOrderPlaced(orderId: string): Promise<void> {
  const { error } = await supabase.rpc("notify_order_placed", {
    order_uuid: orderId,
  });
  if (error) throw error;
}

export async function notifyOrderStatusChanged(
  orderId: string,
  status: string,
): Promise<void> {
  const { error } = await supabase.rpc("notify_order_status_changed", {
    order_uuid: orderId,
    new_status: status,
  });
  if (error) throw error;
}

export async function notifyDeliveryAssigned(orderId: string): Promise<void> {
  const { error } = await supabase.rpc("notify_delivery_assigned", {
    order_uuid: orderId,
  });
  if (error) throw error;
}

export async function notifyStorePending(storeId: string): Promise<void> {
  const { error } = await supabase.rpc("notify_store_pending", {
    store_uuid: storeId,
  });
  if (error) throw error;
}

export async function notifyStoreStatusChanged(
  storeId: string,
  status: "APPROVED" | "SUSPENDED" | "PENDING",
): Promise<void> {
  const { error } = await supabase.rpc("notify_store_status_changed", {
    store_uuid: storeId,
    new_status: status,
  });
  if (error) throw error;
}
