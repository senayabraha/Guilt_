// Supabase Edge Function: admin-only creation of a delivery partner. Provisions
// a Supabase Auth user and the linked delivery_partners row.
//
// Deploy: supabase functions deploy admin-create-delivery-partner
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify the caller is an admin.
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "ADMIN") return json({ error: "Admin access required" }, 403);

    const { name, email, password, phone, vehicleType, partnerType, storeId } = await req.json();
    if (!name || !email || !password || !phone)
      return json({ error: "Missing required fields" }, 400);
    if (partnerType === "store_owned" && !storeId)
      return json({ error: "storeId is required for store_owned partners" }, 400);

    // Create the auth user.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: String(email).toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name, role: "DELIVERY" },
    });
    if (createErr) return json({ error: createErr.message }, 400);

    // Link the delivery_partners row.
    const { error: insertErr } = await admin.from("delivery_partners").insert({
      auth_user_id: created.user.id,
      name,
      email: String(email).toLowerCase(),
      phone,
      vehicle_type: vehicleType ?? "bike",
      partner_type: partnerType ?? "marketplace",
      store_id: storeId ?? null,
    });
    if (insertErr) {
      // Roll back the auth user if the row insert failed.
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: insertErr.message }, 400);
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
