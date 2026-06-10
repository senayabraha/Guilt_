import { supabase } from "../supabase";
import { mapProduct } from "./mappers";
import type { Product } from "../../types";

type FavoriteProductRow = {
  product_id: string;
};

type FavoriteWithProductRow = {
  product: unknown;
};

export async function getFavoriteProductIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("product_favorites")
    .select("product_id")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as FavoriteProductRow[]).map((row) => row.product_id);
}

export async function getFavoriteProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("product_favorites")
    .select("product:products(*, store:stores(*))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as FavoriteWithProductRow[])
    .map((row) => row.product)
    .filter(Boolean)
    .map((product) => mapProduct(product));
}

export async function saveProduct(productId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("product_favorites")
    .upsert(
      { product_id: productId, user_id: userId },
      { onConflict: "user_id,product_id" },
    );
  if (error) throw error;
}

export async function unsaveProduct(productId: string): Promise<void> {
  const { error } = await supabase
    .from("product_favorites")
    .delete()
    .eq("product_id", productId);
  if (error) throw error;
}
