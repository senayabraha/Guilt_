# Zembil Market

**Shop local stores in one place.**

Zembil Market is a multi-store grocery delivery marketplace for Addis Ababa,
connecting customers with local stores, vendors, delivery partners, and
platform admins. Customers browse nearby stores, order groceries and everyday
essentials, and track deliveries in real time — all from one place.

> _Zembil_ (ዘምቢል) is the traditional woven basket Ethiopians carry to market.
> This app brings that everyday errand online for Addis Ababa.

---

## Brand

- **Name:** Zembil Market
- **Tagline:** Shop local stores in one place.
- **Focus:** Addis Ababa, Ethiopia
- **Feel:** fast, local, fresh, trusted

### Palette

| Token       | Color     |
| ----------- | --------- |
| Deep green  | `#1B3022` |
| Fresh green | `#3D6B4A` |
| Orange      | `#F97316` |
| Cream       | `#FAF7F2` |

---

## Roles

- **Customer** — browse stores, shop groceries, place orders, track delivery.
- **Store Dashboard** (vendor) — manage a store, products, and incoming orders.
- **Delivery Partner** — pick up from stores and deliver to customers.
- **Admin Panel** — review store applications, approve/suspend stores, and
  oversee products, orders, and delivery partners.

---

## Marketplace experience

Zembil Market is designed as a real shopping tool, not just a landing page. The
homepage and store pages draw on proven marketplace usability patterns:

- **Search** products and stores from a prominent search bar near the top.
- **Store discovery** — "Shop by store" strip and "Stores near you in Addis
  Ababa" with local store cards.
- **Delivery estimates**, neighborhood/city, open-now status, and delivery fee
  on every store card.
- **Today's deals** — discounted products (via `original_price` vs `price`).
- **Local store browsing** across Bole, Kazanchis, CMC, Piassa, Megenagna,
  Sarbet, and more.
- **Location selector** — a "Delivering to …" Addis Ababa area indicator.
- **ETB pricing** — money is displayed in Ethiopian Birr (e.g. `ETB 250`) via a
  shared `formatCurrency` helper.

---

## Current Stack

The customer-facing app runs on a modern, Supabase-backed stack:

- **React / Vite / TypeScript** — frontend SPA
- **Supabase Auth** — authentication
- **Supabase Postgres + RLS** — data with row-level security
- **Supabase Storage** — images and assets
- **Vercel** — hosting and deployment
- **Cash / test checkout** through Supabase RPC
- **Stripe** — kept for a future payments phase (not active yet)

> A legacy Node/Express + Prisma server is retained under `server/` for
> reference and a future phase. It is not required to run the client.

---

## Project Structure

```
client/     React + Vite + TypeScript frontend (Supabase)
server/     Legacy Node/Express + Prisma API (kept for future phase)
supabase/   Supabase config and SQL
vercel.json Deployment configuration
```

---

## Getting Started

### Client

```bash
cd client
npm install
npm run dev
```

Create `client/.env` from `client/.env.example`:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_CURRENCY_SYMBOL=$
```

Build for production:

```bash
npm run build
```

---

## Roadmap

- Activate Stripe payments
- Birr currency and local payment methods
- Store onboarding flow for Addis Ababa neighborhoods
  (Bole, Kazanchis, Piassa, CMC, Megenagna, Sarbet)
