import { supabase } from "../supabase";
import type { DeliveryRequest, DeliveryRequestStatus } from "../../types";

function mapDeliveryRequest(row: any): DeliveryRequest {
  return {
    id: row.id,
    orderId: row.order_id,
    deliveryPartnerId: row.delivery_partner_id ?? null,
    requestedBy: row.requested_by ?? null,
    requestedByRole: row.requested_by_role,
    status: row.status,
    rejectReason: row.reject_reason ?? null,
    orderSnapshot: row.order_snapshot ?? null,
    expiresAt: row.expires_at ?? null,
    respondedAt: row.responded_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Admin or vendor: dispatch a specific driver to an order.
// Returns the new request's UUID.
export async function createDeliveryRequest(
  orderId: string,
  partnerId: string,
  expiresInMinutes = 10,
): Promise<string> {
  const { data, error } = await supabase.rpc("create_delivery_request", {
    order_uuid: orderId,
    partner_uuid: partnerId,
    expires_minutes: expiresInMinutes,
  });
  if (error) throw error;
  return data as string;
}

// Driver: list delivery requests targeted at the signed-in driver.
// Pass a status filter to narrow results (e.g. 'pending' for the inbox).
export async function getMyDeliveryRequests(
  status?: DeliveryRequestStatus,
): Promise<DeliveryRequest[]> {
  let query = supabase
    .from("delivery_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapDeliveryRequest);
}

// Driver: accept a pending request.
// The RPC assigns the driver to the order and generates the delivery OTP.
export async function acceptDeliveryRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("accept_delivery_request", {
    request_uuid: requestId,
  });
  if (error) throw error;
}

// Driver: reject a pending request with an optional reason.
// Admins are notified so they can re-dispatch.
export async function rejectDeliveryRequest(
  requestId: string,
  reason?: string,
): Promise<void> {
  const { error } = await supabase.rpc("reject_delivery_request", {
    request_uuid: requestId,
    reject_reason: reason ?? null,
  });
  if (error) throw error;
}

// Admin or vendor: list all delivery requests for a specific order.
export async function getOrderDeliveryRequests(
  orderId: string,
): Promise<DeliveryRequest[]> {
  const { data, error } = await supabase
    .from("delivery_requests")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDeliveryRequest);
}

// Admin: cancel a pending request (direct update — allowed by the
// "delivery requests admin manage" RLS policy).
export async function cancelDeliveryRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("delivery_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("status", "pending");
  if (error) throw error;
}

// Admin / cron: expire all pending requests past their expires_at.
// Returns the number of rows affected.
export async function expirePendingRequests(): Promise<number> {
  const { data, error } = await supabase.rpc(
    "expire_pending_delivery_requests",
  );
  if (error) throw error;
  return (data as number) ?? 0;
}
