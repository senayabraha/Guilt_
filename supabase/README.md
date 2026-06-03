# Supabase Backend Setup

This app is migrating from the Express + Prisma backend to Supabase
(Auth + Postgres + RLS + Storage + Edge Functions). The frontend already talks
to Supabase directly for all database reads/writes; Stripe and privileged
operations run in Edge Functions.

## 1. Create a project & apply schema

1. Create a Supabase project.
2. In the SQL editor, run, in order:
   - `schema.sql` — tables, enums, triggers, RLS policies, helper functions,
     the `visible_products` view, the role-escalation guard, and the
     `complete_delivery` RPC.
   - `storage.sql` — creates the `product-images`, `store-images`, and
     `avatars` buckets (public read, authenticated write).
3. Optionally run `seed.sql` after registering at least one user (it attaches a
   demo approved store + 8 products to the first profile and makes them VENDOR).

## 2. Frontend environment variables (`client/.env`)

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable / anon key>
VITE_CURRENCY_SYMBOL=$
```

`VITE_BASE_URL` is no longer required — the app no longer calls the Express API.

## 3. Checkout (current: cash/test flow — no Stripe)

Checkout currently creates orders directly via the `place_order` RPC (in
`schema.sql`): it validates the cart, enforces a single store, computes totals,
creates a `payment_method = 'cash'`, `is_paid = false`, `status = 'Placed'`
order, and decrements stock. **No Stripe setup is required.**

## 4. Edge Functions

Only `admin-create-delivery-partner` is needed for current functionality
(creating delivery partners):

```
supabase functions deploy admin-create-delivery-partner
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
injected automatically for deployed functions.

### Stripe (optional, for later)

The `create-checkout-session` and `stripe-webhook` functions are kept for when
real payments are wired up. They are **not** required for the cash flow above.
When ready:

```
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...
```

Then point a Stripe webhook at the deployed `stripe-webhook` URL (subscribe to
`checkout.session.completed`) and switch `Checkout.tsx` back to invoking
`create-checkout-session`.

## 5. Roles

- **CUSTOMER / VENDOR**: created via app registration (Supabase Auth). The
  `handle_new_user` trigger creates a `profiles` row. Applying for a store
  promotes CUSTOMER → VENDOR (guarded against escalating to ADMIN).
- **ADMIN**: set manually, e.g.
  `update public.profiles set role = 'ADMIN' where email = 'you@example.com';`
- **DELIVERY**: created by an admin via the `admin-create-delivery-partner`
  Edge Function (provisions an auth user + `delivery_partners` row linked by
  `auth_user_id`).

## Migration status

The legacy `server/` (Express + Prisma) is intentionally kept until the
Supabase flow is verified end-to-end. Checkout currently uses the cash
`place_order` RPC; Stripe Edge Functions are kept for later. Once the Supabase
flow is verified, the Express server and Prisma can be removed.
