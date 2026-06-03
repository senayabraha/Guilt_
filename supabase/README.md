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
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_STRIPE_PUBLISHABLE_KEY=<pk_...>   # optional
VITE_CURRENCY_SYMBOL=$
```

`VITE_BASE_URL` is no longer required — the app no longer calls the Express API.

## 3. Edge Functions

Deploy with the Supabase CLI:

```
supabase functions deploy create-checkout-session
supabase functions deploy admin-create-delivery-partner
supabase functions deploy stripe-webhook --no-verify-jwt
```

Set function secrets:

```
supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
injected automatically for deployed functions.

Point a Stripe webhook endpoint at the deployed `stripe-webhook` function URL
and subscribe to `checkout.session.completed`.

## 4. Roles

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
Supabase flow is verified end-to-end (see Phase 7). Once verified, the Express
server and Prisma can be removed; Stripe is already handled by Edge Functions.
