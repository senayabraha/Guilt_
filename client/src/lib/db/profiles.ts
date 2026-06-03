import { supabase } from "../supabase";
import { mapProfile } from "./mappers";
import type { User } from "../../types";

export async function getProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data) : null;
}

export async function updateProfile(
  userId: string,
  updates: { name?: string; phone?: string; avatar?: string },
): Promise<User> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return mapProfile(data);
}

// Promote the current user to VENDOR (allowed by the role-escalation guard
// only for CUSTOMER -> VENDOR self-transitions).
export async function becomeVendor(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ role: "VENDOR" })
    .eq("id", userId);
  if (error) throw error;
}
