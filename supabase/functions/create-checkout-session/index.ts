// Supabase Edge Function: validates the cart, computes totals, creates an order,
// and (for card payments) a Stripe Checkout session. COD orders are placed and
// stock is decremented immediately; card orders decrement stock on webhook.
//
// Deploy: supabase functions deploy create-checkout-session
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

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

    // Identify the caller from their JWT.
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const { items, shippingAddress, paymentMethod } = await req.json();
    if (!items || items.length === 0) return json({ error: "No order items" }, 400);

    const productIds = items.map((i: any) => i.product);
    const { data: products, error: prodErr } = await admin
      .from("products")
      .select("*, store:stores(*)")
      .in("id", productIds);
    if (prodErr) throw prodErr;

    const map: Record<string, any> = {};
    (products ?? []).forEach((p: any) => (map[p.id] = p));

    for (const item of items) {
      const p = map[item.product];
      if (!p) return json({ error: "One or more products no longer exist" }, 404);
      if (!p.is_active) return json({ error: `${p.name} is no longer available` }, 400);
      if ((p.stock ?? 0) < item.quantity)
        return json({ error: `${p.name} is out of stock` }, 400);
      if (p.store_id) {
        if (!p.store || p.store.status !== "APPROVED" || !p.store.is_open)
          return json({ error: `${p.name}'s store is not accepting orders` }, 400);
      }
    }

    // Enforce one-store cart.
    const storeIds = Array.from(
      new Set(items.map((i: any) => map[i.product]?.store_id ?? null)),
    );
    if (storeIds.length > 1)
      return json({ error: "Please checkout items from one store at a time." }, 400);
    const storeId = (storeIds[0] as string | null) ?? null;
    const store = storeId ? map[items[0].product]?.store : null;

    const orderItems = items.map((item: any) => {
      const p = map[item.product];
      return {
        product: p.id,
        name: p.name,
        image: p.image,
        price: Number(p.price),
        quantity: item.quantity,
        unit: p.unit,
      };
    });

    const subtotal = orderItems.reduce(
      (s: number, i: any) => s + i.price * i.quantity,
      0,
    );
    const deliveryFee = store
      ? Number(store.delivery_fee ?? 1.99)
      : subtotal > 20
      ? 0
      : 1.99;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        store_id: storeId,
        items: orderItems,
        shipping_address: shippingAddress ?? {},
        payment_method: paymentMethod,
        subtotal,
        delivery_fee: deliveryFee,
        tax,
        total,
        is_paid: false,
        status: "Placed",
        status_history: [
          { status: "Placed", note: "Order placed successfully", timestamp: new Date().toISOString() },
        ],
      })
      .select("id")
      .single();
    if (orderErr) throw orderErr;

    if (paymentMethod === "card") {
      const origin = req.headers.get("origin") ?? "";
      const session = await stripe.checkout.sessions.create({
        success_url: `${origin}/orders?clearCart=true`,
        cancel_url: `${origin}/checkout`,
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Grocery Order" },
              unit_amount: Math.round(total * 100),
            },
            quantity: 1,
          },
        ],
        metadata: { orderId: order.id },
      });
      await admin
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id);
      return json({ url: session.url });
    }

    // COD: decrement stock immediately.
    for (const item of orderItems) {
      const p = map[item.product];
      await admin
        .from("products")
        .update({ stock: (p.stock ?? 0) - item.quantity })
        .eq("id", item.product);
    }

    return json({ orderId: order.id });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
