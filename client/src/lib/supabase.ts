import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const normalizeSupabaseUrl = (url?: string) =>
  url?.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

// Whether real Supabase credentials are present.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

if (!isSupabaseConfigured) {
  // Don't crash the app — let the UI render so it can be previewed before the
  // Supabase project is connected. Data features stay disabled (and per-page
  // calls fail gracefully) until the env vars are set.
  console.warn(
    "Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY). " +
      "The UI will load but data features are disabled until they are configured.",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabasePublishableKey || "placeholder-publishable-key",
);
