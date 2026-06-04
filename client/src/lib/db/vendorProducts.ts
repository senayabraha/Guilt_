import { supabase } from "../supabase";
import { mapProduct, toProductRow } from "./mappers";
import type { Product } from "../../types";
import { getMyStores } from "./stores";
import { getStoreProducts } from "./products";

// All products across every store the vendor owns, each tagged with its store
// so the UI can show the store name and filter by store. Even the "same"
// product in two stores is two separate rows (distinct store_id/stock).
export async function getMyVendorProducts(): Promise<Product[]> {
  const stores = await getMyStores();
  const perStore = await Promise.all(
    stores.map(async (s) => {
      const products = await getStoreProducts(s.id);
      return products.map((p) => ({ ...p, store: s, storeId: s.id }));
    }),
  );
  return perStore.flat();
}

// Create one product row per selected store. Each row is a standalone product
// with its own store_id (never a single product with multiple store_ids).
// Only the vendor's own APPROVED stores are allowed.
export async function createVendorProductForStores(
  form: any,
  storeIds: string[],
): Promise<Product[]> {
  if (!storeIds || storeIds.length === 0) {
    throw new Error("Select at least one store.");
  }

  // Validate every requested store against the vendor's own approved stores;
  // never trust an arbitrary store_id from the client.
  const myStores = await getMyStores();
  const approvedIds = new Set(
    myStores.filter((s) => s.status === "APPROVED").map((s) => s.id),
  );
  const allowed = Array.from(new Set(storeIds)).filter((id) =>
    approvedIds.has(id),
  );

  if (allowed.length === 0 || allowed.length !== new Set(storeIds).size) {
    throw new Error("You can only add products to your approved stores.");
  }

  const rows = allowed.map((storeId) => toProductRow(form, storeId));
  const { data, error } = await supabase
    .from("products")
    .insert(rows)
    .select("*");
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}
