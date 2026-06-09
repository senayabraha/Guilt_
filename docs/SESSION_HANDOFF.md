# Session Handoff — Zembil Market

This document captures the work completed so far and the recommended next steps so the next session can pick up without re-reading the full commit history.

---

## Branch

`claude/session-handoff-docs-rem5j4` — all recent work lives here; it is **not yet merged to `main`**.

---

## What Was Done This Session

### 1. Customer-facing UX hardening

| Commit | Summary |
|---|---|
| `3b1e90f` | Cart: "Continue Shopping" button, clearer one-store rule messaging |
| `bea8979` | Product detail modal: image carousel polish, thumbnails, swipe, stock/quantity display |
| `8cfddf3` | Product cards: store name, stock signals, rating, review count, ETA trust cues |
| `d84df39` | Search / filter / sort / category navigation UX improvements |
| `2a6e58a` | Checkout: fixed field mappings, delivery fee calculation, payment method |

### 2. Vendor flow improvements

| Commit | Summary |
|---|---|
| `8054c19` | Vendor onboarding: state-aware routing (pending / approved / suspended clearly separated) |
| `2a2075a` | Vendor product form: sectioned layout, validation, multi-image upload |
| `584c254` | Vendor dashboard: hierarchy, open/close store toggle, settings UX |
| `c4ca922` | Vendor orders: list visibility, prep-flow UX, partial-availability handling |
| `ebf8ec4` | Customer orders: order history and tracking UX (timeline, statuses) |

### 3. Backend security and database

| Commit | Summary |
|---|---|
| `1f64a2c` | RLS hardening: handle_new_user always assigns CUSTOMER role; orders INSERT locked to `place_order` RPC; products/stores DELETE policies; atomic stock decrement with guard; CHECK constraints on price/stock; performance indexes on addresses, orders; storage upload restricted to VENDOR/ADMIN |
| `f604b36` | Added `supabase/migrations/` folder for Supabase GitHub integration |
| `4d7037d` | Backfilled three historical migrations (initial schema, storage setup, product & RLS) so the folder reflects full deployment history |

---

## Current Migration State

Four migration files exist in `supabase/migrations/`:

| File | Status |
|---|---|
| `20260101000000_initial_schema.sql` | Marker only — schema was applied manually before the migrations folder existed |
| `20260201000000_storage_setup.sql` | Storage buckets + policies |
| `20260301000000_product_and_rls.sql` | images/specs columns, RLS recursion fix |
| `20260608000000_security_and_perf.sql` | Latest — security hardening, indexes, RLS completions |

> **Action needed before running `supabase db push`:** The three backfilled migrations must be marked as already-applied in the `supabase_migrations.schema_migrations` table. Run the companion INSERT from the commit message of `4d7037d` in the Supabase SQL editor first.

The standalone `supabase/migration_security_and_perf.sql` is the same content as `20260608000000_security_and_perf.sql`. It was written to be safe to re-run on an existing database (idempotent guards included).

---

## What Remains (from the Action Plan)

The `docs/marketplace-understanding.md` defines four phases. Phases 1–2 are mostly complete. What's left:

### Phase 1 remnants (critical)

- [ ] **Unified cart / order totals** — cart-calculated subtotal can still diverge from the server-computed total returned by `place_order`. A `preview_order` RPC (or equivalent) that returns the server-side total before placement would fix this.
- [ ] **Unavailable-item adjustments** — when a vendor marks an item unavailable during preparation, the customer currently gets no structured notification, substitution offer, or partial refund path. This needs a workflow.

### Phase 2 (trust and conversion)

- [ ] Favorites / saved items (no table or UI yet)
- [ ] Ratings and reviews (columns exist on `products`; no write path or review table yet)
- [ ] Delivery ETA and store preparation time (store hours not stored; ETA is static text)
- [ ] Customer support / order help entry points on order screens
- [ ] Store hours and closed-state logic

### Phase 3 (vendor operations)

- [ ] Vendor notifications (new orders)
- [ ] Structured product specifications (currently free-text)
- [ ] Low-stock alerts and restock actions
- [ ] Basic sales analytics with time filters

### Phase 4 (marketplace scale — future)

- Normalized `order_items` table (currently JSONB in orders)
- `product_images` table (currently text[])
- Product variants
- Promotions, bulk upload, loyalty

---

## Key Files to Know

| Path | What it is |
|---|---|
| `client/src/lib/db/orders.ts` | Customer-facing order queries |
| `client/src/lib/db/vendorOrders.ts` | Vendor order queries |
| `client/src/lib/db/products.ts` | Product queries |
| `client/src/pages/Checkout.tsx` | Three-step checkout flow |
| `client/src/pages/OrderTracking.tsx` | Customer order tracking |
| `client/src/pages/MyOrders.tsx` | Customer order history |
| `client/src/pages/vendor/VendorDashboard.tsx` | Vendor home with metrics |
| `client/src/pages/vendor/VendorOrders.tsx` | Vendor order list |
| `client/src/pages/vendor/VendorOrderPrepare.tsx` | Item-by-item preparation flow |
| `client/src/pages/vendor/VendorSettings.tsx` | Store settings and open/close |
| `client/src/pages/vendor/VendorProductForm.tsx` | Product create/edit |
| `client/src/context/CartContext.tsx` | Cart state and one-store rule |
| `client/src/context/AuthContext.tsx` | Auth state and role |
| `client/src/components/ProtectedRoute.tsx` | Auth guard for customer routes |
| `supabase/schema.sql` | Full current schema (source of truth) |
| `supabase/migrations/` | Ordered migration history |

---

## Technical Notes for Next Session

- **Supabase RPC `place_order`** handles all order inserts. Customers cannot INSERT into orders directly (RLS blocks it). Any order-total preview should also go through an RPC so the same pricing logic applies.
- **`handle_new_user` trigger** always sets role to `CUSTOMER` regardless of signup metadata — this prevents role escalation at registration.
- **Storage upload policies** restrict product/store image uploads to `VENDOR` and `ADMIN` roles. Customers cannot upload to those buckets.
- **`products.images`** is `jsonb` (previously `text[]`); the migration cast it. Any new code reading images should expect a JSON array.
- **Cart one-store rule** is enforced in `CartContext.tsx` on the client. It is not enforced at the database level — `place_order` trusts that all items belong to one store. If direct API access is a concern, add a server-side check in the RPC.
- **ETB currency** is formatted via `client/src/lib/format.ts` `formatCurrency()`. The env var `VITE_CURRENCY_SYMBOL` controls the symbol shown.
