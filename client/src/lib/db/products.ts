import { supabase } from "../supabase";
import { mapProduct, toProductRow } from "./mappers";
import type { Product } from "../../types";

const PRODUCT_WITH_STORE = "*, store:stores(*)";

export interface ProductFilters {
  storeId?: string;
  category?: string;
  search?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  sort?: string;
}

function applySort(query: any, sort?: string) {
  if (!sort) return query.order("created_at", { ascending: false });
  if (sort.includes("price") && (sort.includes("asc") || sort.includes("low")))
    return query.order("price", { ascending: true });
  if (sort.includes("price") && (sort.includes("desc") || sort.includes("high")))
    return query.order("price", { ascending: false });
  if (sort.includes("rating")) return query.order("rating", { ascending: false });
  if (sort.includes("name")) return query.order("name", { ascending: true });
  return query.order("created_at", { ascending: false });
}

// Public, RLS-safe product browsing via the visible_products view.
export async function getPublicProducts(
  filters: ProductFilters = {},
): Promise<Product[]> {
  let query = supabase.from("visible_products").select("*");

  if (filters.storeId) query = query.eq("store_id", filters.storeId);
  if (filters.category && filters.category !== "all")
    query = query.eq("category", filters.category);
  if (filters.search)
    query = query.or(
      `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
    );
  if (filters.minPrice) query = query.gte("price", Number(filters.minPrice));
  if (filters.maxPrice) query = query.lte("price", Number(filters.maxPrice));

  query = applySort(query, filters.sort);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function getFlashDeals(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("visible_products")
    .select("*")
    .order("original_price", { ascending: false })
    .limit(8);
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_STORE)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data) : null;
}

// Admin: all products (RLS grants admins full read).
export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_STORE)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function createProduct(
  form: any,
  storeId: string | null = null,
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert(toProductRow(form, storeId))
    .select(PRODUCT_WITH_STORE)
    .single();
  if (error) throw error;
  return mapProduct(data);
}

export async function updateProduct(id: string, form: any): Promise<Product> {
  // store_id is intentionally never passed for updates.
  const { data, error } = await supabase
    .from("products")
    .update(toProductRow(form))
    .eq("id", id)
    .select(PRODUCT_WITH_STORE)
    .single();
  if (error) throw error;
  return mapProduct(data);
}

// Soft delete: hide and zero out stock.
export async function deactivateProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ is_active: false, stock: 0 })
    .eq("id", id);
  if (error) throw error;
}

// Vendor: list products for a given store.
export async function getStoreProducts(storeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}
