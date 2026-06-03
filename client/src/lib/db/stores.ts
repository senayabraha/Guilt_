import { supabase } from "../supabase";
import { mapStore, mapProduct, toStoreRow } from "./mappers";
import type { Product, Store } from "../../types";

const STORE_WITH_COUNTS = "*, products(count), orders(count)";
const STORE_WITH_OWNER_COUNTS =
  "*, owner:profiles(id, name, email, phone, role), products(count), orders(count)";

// Public: approved & open stores (enforced by RLS), optional search/category.
export async function getPublicStores(opts: {
  search?: string;
  category?: string;
} = {}): Promise<Store[]> {
  let query = supabase
    .from("stores")
    .select(STORE_WITH_COUNTS)
    .eq("status", "APPROVED")
    .eq("is_open", true);

  if (opts.search)
    query = query.or(
      `name.ilike.%${opts.search}%,description.ilike.%${opts.search}%`,
    );
  if (opts.category && opts.category !== "all")
    query = query.contains("categories", [opts.category]);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapStore);
}

export async function getPublicStore(id: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from("stores")
    .select(STORE_WITH_COUNTS)
    .eq("id", id)
    .eq("status", "APPROVED")
    .eq("is_open", true)
    .maybeSingle();
  if (error) throw error;
  return data ? mapStore(data) : null;
}

export async function getPublicStoreProducts(
  storeId: string,
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("visible_products")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

// Vendor: the current user's store (owner_id = auth.uid()).
export async function getMyStore(): Promise<Store | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapStore(data) : null;
}

export async function applyForStore(
  form: any,
  ownerId: string,
): Promise<Store> {
  const row = toStoreRow(form, ownerId);
  row.status = "PENDING";
  const { data, error } = await supabase
    .from("stores")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return mapStore(data);
}

export async function updateMyStore(id: string, form: any): Promise<Store> {
  const { data, error } = await supabase
    .from("stores")
    .update(toStoreRow(form))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapStore(data);
}

// Admin: all stores.
export async function getAllStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select(STORE_WITH_OWNER_COUNTS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapStore);
}

export async function getAdminStore(id: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("stores")
    .select(
      "*, owner:profiles(id, name, email, phone, role), products(*), orders(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const store: any = mapStore(data);
  store.products = (data.products ?? []).map(mapProduct);
  store.orders = (data.orders ?? [])
    .slice()
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 20);
  return store;
}

export async function setStoreStatus(
  id: string,
  status: "APPROVED" | "SUSPENDED" | "PENDING",
): Promise<Store> {
  const { data, error } = await supabase
    .from("stores")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapStore(data);
}

export async function updateAdminStore(id: string, form: any): Promise<Store> {
  return updateMyStore(id, form);
}
