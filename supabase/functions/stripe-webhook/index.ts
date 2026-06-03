// Supabase Edge Function: Stripe webhook. Marks the order paid and decrements
// stock once payment succeeds.
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL,
//          SUPABASE_SERVICE_ROLE_KEY
// Configure this function's URL as a Stripe webhook endpoint.
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      secret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const { data: order } = await admin
        .from("orders")
        .select("items, status_history, is_paid")
        .eq("id", orderId)
        .maybeSingle();

      if (order && !order.is_paid) {
        const history = Array.isArray(order.status_history)
          ? order.status_history
          : [];
        history.push({
          status: "Confirmed",
          note: "Payment received",
          timestamp: new Date().toISOString(),
        });
        await admin
          .from("orders")
          .update({ is_paid: true, status: "Confirmed", status_history: history })
          .eq("id", orderId);

        // Decrement stock for each item.
        for (const item of order.items ?? []) {
          const { data: p } = await admin
            .from("products")
            .select("stock")
            .eq("id", item.product)
            .maybeSingle();
          if (p) {
            await admin
              .from("products")
              .update({ stock: Math.max(0, (p.stock ?? 0) - item.quantity) })
              .eq("id", item.product);
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
