import { supabase } from "../supabase";
import { mapAddress, toAddressRow } from "./mappers";
import type { Address } from "../../types";

export async function getMyAddresses(): Promise<Address[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAddress);
}

export async function createAddress(
  form: any,
  userId: string,
): Promise<Address> {
  const { data, error } = await supabase
    .from("addresses")
    .insert(toAddressRow(form, userId))
    .select("*")
    .single();
  if (error) throw error;
  return mapAddress(data);
}

export async function updateAddress(id: string, form: any): Promise<Address> {
  const { data, error } = await supabase
    .from("addresses")
    .update(toAddressRow(form))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapAddress(data);
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from("addresses").delete().eq("id", id);
  if (error) throw error;
}
