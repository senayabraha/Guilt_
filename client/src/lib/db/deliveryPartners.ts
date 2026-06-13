import { supabase } from "../supabase";
import { mapDeliveryPartner, mapOrder } from "./mappers";
import type { DeliveryPartner, Order } from "../../types";
import { notifyOrderStatusChanged } from "./notifications";

const PICKUP_FULL =
  "*, store:stores(*), user:profiles(id, name, email, phone)";

// The delivery_partners row linked to the currently signed-in auth user.
export async function getMyPartner(): Promise<DeliveryPartner | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("delivery_partners")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapDeliveryPartner(data) : null;
}

export async function getMyDeliveries(
  partnerId: string,
  status?: string,
): Promise<Order[]> {
  let query = supabase
    .from("orders")
    .select(PICKUP_FULL)
    .eq("delivery_partner_id", partnerId);
  if (status === "active")
    query = query.in("status", ["Assigned", "Ready for Pickup", "Picked Up", "Out for Delivery"]);
  else if (status === "completed")
    query = query.in("status", ["Delivered", "Cancelled"]);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOrder);
}

export async function getDeliveryDetail(
  partnerId: string,
  id: string,
): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(PICKUP_FULL)
    .eq("id", id)
    .eq("delivery_partner_id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapOrder(data) : null;
}

export async function updateDeliveryLocation(
  id: string,
  lat: number,
  lng: number,
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ live_location: { lat, lng, updatedAt: new Date().toISOString() } })
    .eq("id", id);
  if (error) throw error;
}

export async function completeDelivery(id: string, otp: string): Promise<void> {
  const { error } = await supabase.rpc("complete_delivery", {
    order_uuid: id,
    otp_input: otp,
  });
  if (error) throw error;
  notifyOrderStatusChanged(id, "Delivered").catch((err) =>
    console.warn("Failed to create delivery completion notification", err),
  );
}

// --- Admin management ---

export async function getAllPartners(): Promise<DeliveryPartner[]> {
  const { data, error } = await supabase
    .from("delivery_partners")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDeliveryPartner);
}

export async function updatePartner(
  id: string,
  updates: { name?: string; phone?: string; vehicleType?: string; isActive?: boolean },
): Promise<DeliveryPartner> {
  const row: any = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.phone !== undefined) row.phone = updates.phone;
  if (updates.vehicleType !== undefined) row.vehicle_type = updates.vehicleType;
  if (updates.isActive !== undefined) row.is_active = updates.isActive;
  const { data, error } = await supabase
    .from("delivery_partners")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapDeliveryPartner(data);
}

// Creating a partner provisions a Supabase Auth user, so it runs in an
// Edge Function with the service role.
export async function createPartner(payload: {
  name: string;
  email: string;
  password: string;
  phone: string;
  vehicleType?: string;
}): Promise<void> {
  const { error } = await supabase.functions.invoke(
    "admin-create-delivery-partner",
    { body: payload },
  );
  if (error) throw error;
}
