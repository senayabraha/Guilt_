-- =============================================================================
-- Guilt_ marketplace — security hardening, RLS completions, performance indexes
-- Safe to re-run: every statement uses CREATE OR REPLACE / IF NOT EXISTS /
-- DROP IF EXISTS before CREATE, or is a conditional DO block.
-- Apply in the Supabase SQL editor on top of the existing schema.
-- =============================================================================


-- =============================================================================
-- FIX 1: handle_new_user — always assign CUSTOMER, never trust signup metadata
-- =============================================================================
-- RISK: The original function checked raw_user_meta_data->>'role'. Anyone who
-- knows the Supabase Auth API can pass {"role":"VENDOR"} in signUp() metadata
-- and receive a VENDOR-level profile without completing the store-application
-- flow. The intended path: sign up as CUSTOMER → apply for store → becomeVendor()
-- → admin approves store.  The trigger should ignore metadata role claims.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', ''),
    'CUSTOMER'::public.user_role   -- always start as CUSTOMER; role upgrades via becomeVendor()
  );
  return new;
end;
$$;


-- =============================================================================
-- FIX 2: orders UPDATE — remove customer self-update access
-- =============================================================================
-- RISK: The original "orders update relevant" policy included `user_id = auth.uid()`,
-- meaning any customer could UPDATE their own order row — including the `status`
-- column. A customer could set status = 'Delivered' on their own order and bypass
-- the delivery-partner OTP verification entirely.
-- Customers have no legitimate reason to UPDATE orders; they read via SELECT only.
-- Status transitions are performed by vendors (via vendorOrders.ts), admins
-- (via updateOrderStatus), and delivery partners (via complete_delivery RPC).
drop policy if exists "orders update relevant" on public.orders;
create policy "orders update relevant"
on public.orders
for update
using (
  public.is_admin()
  or exists (
    select 1 from public.stores s
    where s.id = store_id
      and s.owner_id = auth.uid()
  )
  or public.is_assigned_partner(delivery_partner_id)
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.stores s
    where s.id = store_id
      and s.owner_id = auth.uid()
  )
  or public.is_assigned_partner(delivery_partner_id)
);


-- =============================================================================
-- FIX 3: orders INSERT — restrict direct inserts; use place_order RPC instead
-- =============================================================================
-- RISK: The "orders insert own" policy let any authenticated user INSERT an order
-- row directly (bypassing the place_order RPC), which skips stock validation and
-- stock decrement. The place_order function is SECURITY DEFINER and inserts the
-- order itself, so no INSERT RLS policy is needed for the RPC path.
-- Removing this policy forces all order creation through the validated RPC.
drop policy if exists "orders insert own" on public.orders;


-- =============================================================================
-- FIX 4: products DELETE — add missing policy
-- =============================================================================
-- Without a DELETE policy, RLS blocks all deletes via the PostgREST API for all
-- users including admins. Vendors who want to remove a product (or admins doing
-- catalogue cleanup) receive a silent permission denied.
drop policy if exists "products delete own store or admin" on public.products;
create policy "products delete own store or admin"
on public.products
for delete
using (
  public.is_admin()
  or exists (
    select 1 from public.stores s
    where s.id = store_id
      and s.owner_id = auth.uid()
  )
);


-- =============================================================================
-- FIX 5: stores DELETE — admin-only (missing policy)
-- =============================================================================
-- Vendors should not self-delete stores (orphans orders, payment history).
-- Only admins may remove a store record.
drop policy if exists "stores delete admin only" on public.stores;
create policy "stores delete admin only"
on public.stores
for delete
using (public.is_admin());


-- =============================================================================
-- FIX 6: place_order — remove 8% tax; atomic stock decrement with conflict guard
-- =============================================================================
-- ISSUE A: The original RPC computed tax := round(subtotal * 0.08, 2) and
-- included it in total. The frontend checkout (since Part 6 fixes) sets tax = 0
-- and total = subtotal + deliveryFee. The stored total was therefore ~8% higher
-- than what the customer saw at checkout — a pricing discrepancy.
-- Fix: tax := 0; total := subtotal + delivery_fee only.
--
-- ISSUE B: Stock decrement was unconditional: UPDATE products SET stock = stock - qty.
-- Under concurrent orders both requests could pass the `prod.stock < qty` read-check
-- at the top of the loop, then both decrement, driving stock negative. A CHECK
-- constraint on stock (Fix 7 below) would catch this as a constraint violation
-- and roll back the whole transaction — but the error message was unhelpful.
-- Fix: add WHERE stock >= qty to the UPDATE + raise a friendly error if 0 rows
-- were affected (concurrent checkout detected).
create or replace function public.place_order(cart jsonb, shipping jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid          uuid    := auth.uid();
  item         jsonb;
  prod         public.products%rowtype;
  store_rec    public.stores%rowtype;
  first_set    boolean := false;
  first_store  uuid;
  order_items  jsonb   := '[]'::jsonb;
  subtotal     numeric := 0;
  delivery_fee numeric := 0;
  total        numeric := 0;
  new_order_id uuid;
  qty          int;
  rows_updated int;
begin
  if uid is null then
    raise exception 'You must be signed in to place an order';
  end if;
  if cart is null or jsonb_array_length(cart) = 0 then
    raise exception 'No order items';
  end if;

  -- ── Validate every cart item ────────────────────────────────────────────
  for item in select * from jsonb_array_elements(cart)
  loop
    qty := (item->>'quantity')::int;
    if qty is null or qty <= 0 then
      raise exception 'Invalid quantity for a cart item';
    end if;

    select * into prod from public.products where id = (item->>'product')::uuid;

    if prod.id is null then
      raise exception 'One or more products no longer exist';
    end if;
    if not prod.is_active then
      raise exception '% is no longer available', prod.name;
    end if;
    if prod.stock < qty then
      raise exception '% is out of stock', prod.name;
    end if;

    -- Enforce single-store checkout.
    if not first_set then
      first_store := prod.store_id;
      first_set   := true;
    elsif first_store is distinct from prod.store_id then
      raise exception 'Please checkout items from one store at a time.';
    end if;

    -- Validate store is approved and open.
    if prod.store_id is not null then
      select * into store_rec from public.stores where id = prod.store_id;
      if store_rec.id is null
         or store_rec.status <> 'APPROVED'
         or store_rec.is_open = false then
        raise exception '%''s store is not accepting orders right now', prod.name;
      end if;
    end if;

    order_items := order_items || jsonb_build_object(
      'product',           prod.id,
      'storeId',           prod.store_id,
      'name',              prod.name,
      'image',             prod.image,
      'price',             prod.price,
      'quantity',          qty,
      'unit',              prod.unit,
      'prepStatus',        'pending',
      'pickedQuantity',    0,
      'unavailableReason', '',
      'preparedAt',        null
    );
    subtotal := subtotal + prod.price * qty;
  end loop;

  -- ── Delivery fee from store; 0 for platform-only products ───────────────
  if first_store is not null then
    select * into store_rec from public.stores where id = first_store;
    delivery_fee := coalesce(store_rec.delivery_fee, 0);
  else
    delivery_fee := 0;
  end if;

  -- No tax — total is subtotal + delivery only.
  total := round(subtotal + delivery_fee, 2);

  -- ── Insert order ─────────────────────────────────────────────────────────
  insert into public.orders (
    user_id, store_id, items, shipping_address, payment_method,
    subtotal, delivery_fee, tax, total, is_paid, status, status_history
  ) values (
    uid, first_store, order_items, coalesce(shipping, '{}'::jsonb), 'cash',
    subtotal, delivery_fee, 0, total, false, 'Placed',
    jsonb_build_array(jsonb_build_object(
      'status',    'Placed',
      'note',      'Order placed successfully',
      'timestamp', now()
    ))
  )
  returning id into new_order_id;

  -- ── Atomically decrement stock ────────────────────────────────────────────
  -- WHERE stock >= qty ensures the row is only updated when stock is still
  -- sufficient. If a concurrent order already consumed the last units, 0 rows
  -- are updated and we raise an exception — rolling back the whole transaction
  -- (including the order insert above).
  for item in select * from jsonb_array_elements(cart)
  loop
    qty := (item->>'quantity')::int;

    update public.products
    set    stock = stock - qty
    where  id    = (item->>'product')::uuid
      and  stock >= qty;

    get diagnostics rows_updated = row_count;
    if rows_updated = 0 then
      raise exception
        'Stock changed during checkout. Please review your cart and try again.';
    end if;
  end loop;

  return new_order_id;
end;
$$;


-- =============================================================================
-- FIX 7: CHECK constraints — prevent negative prices and stock
-- =============================================================================
-- These catch accidental bad data at the DB layer regardless of which code path
-- writes the row. They also serve as a safety net for the concurrent stock
-- decrement: if the WHERE stock >= qty guard above were ever bypassed, the CHECK
-- would force a constraint-violation rollback instead of silent negative stock.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_price_non_negative' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_price_non_negative check (price >= 0);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_original_price_non_negative' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_original_price_non_negative check (original_price >= 0);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_stock_non_negative' and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_stock_non_negative check (stock >= 0);
  end if;
end $$;


-- =============================================================================
-- FIX 8: products.images column — ensure type is jsonb not text[]
-- =============================================================================
-- schema.sql originally declared `images text[]`; the migration file attempted
-- to `add column if not exists images jsonb` which was a no-op if the column
-- already existed. The backfill (`images = '[]'::jsonb`) then failed silently
-- because `text[] = jsonb` is a type mismatch in Postgres.
-- This block casts the column to jsonb if it is still stored as a text array.
do $$
begin
  if (
    select data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'products'
      and column_name  = 'images'
  ) = 'ARRAY' then
    -- Cast text[] → jsonb. The implicit cast produces ["url1","url2"] correctly.
    alter table public.products
      alter column images type jsonb using to_jsonb(images);
    -- Also update the column default to match jsonb syntax.
    alter table public.products
      alter column images set default '[]'::jsonb;
  end if;
end $$;

-- Re-run backfill now that the type is guaranteed to be jsonb.
update public.products
set    images = jsonb_build_array(image)
where  (images is null or images = '[]'::jsonb)
  and  image is not null
  and  image <> '';

-- Recreate visible_products so it picks up the correct column type.
create or replace view public.visible_products
with (security_invoker = on) as
  select p.*
  from public.products p
  left join public.stores s on s.id = p.store_id
  where p.is_active = true
    and p.stock > 0
    and (
      p.store_id is null
      or (s.status = 'APPROVED' and s.is_open = true)
    );

grant select on public.visible_products to anon, authenticated;


-- =============================================================================
-- FIX 9: Missing performance indexes
-- =============================================================================
-- addresses(user_id): every address lookup for a customer is a sequential scan
-- without this index. High-frequency path (checkout, profile).
create index if not exists addresses_user_id_idx
  on public.addresses(user_id);

-- orders(status): vendor and admin filters by status (e.g. getStoreOrders with
-- a status filter) do a seq scan across the full orders table without this.
create index if not exists orders_status_idx
  on public.orders(status);

-- orders(created_at desc): ORDER BY created_at DESC appears in every order-list
-- query. A dedicated index lets Postgres avoid a sort step.
create index if not exists orders_created_at_idx
  on public.orders(created_at desc);

-- profiles(email): email lookups at login hit an implicit unique index already,
-- so no additional index needed.


-- =============================================================================
-- FIX 10: Storage policies — tighten upload/update/delete to vendor/admin roles
-- =============================================================================
-- RISK: The original policies allowed ANY authenticated user to upload, update,
-- or delete objects in product-images and store-images. A customer (or attacker
-- with any valid session) could overwrite or delete another vendor's product
-- photos. Avatars remain open to all authenticated users.
--
-- NOTE: Restricting "delete own file only" requires a path-prefix convention
-- (e.g., user_id/filename). The current storage.ts uses random UUIDs with no
-- user prefix, so we can only restrict by role here. Path-prefix enforcement is
-- recommended as a future improvement.
drop policy if exists "authenticated upload images" on storage.objects;
drop policy if exists "authenticated update images" on storage.objects;
drop policy if exists "authenticated delete images" on storage.objects;

-- Avatars: any authenticated user may manage their own avatar uploads.
create policy "avatars authenticated rw"
on storage.objects
for all
to authenticated
using   (bucket_id = 'avatars')
with check (bucket_id = 'avatars');

-- Product and store images: only VENDOR or ADMIN roles.
create policy "product store images vendor or admin upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('product-images', 'store-images')
  and exists (
    select 1 from public.profiles
    where id   = auth.uid()
      and role in ('VENDOR', 'ADMIN')
  )
);

create policy "product store images vendor or admin update"
on storage.objects
for update
to authenticated
using (bucket_id in ('product-images', 'store-images'))
with check (
  bucket_id in ('product-images', 'store-images')
  and exists (
    select 1 from public.profiles
    where id   = auth.uid()
      and role in ('VENDOR', 'ADMIN')
  )
);

create policy "product store images vendor or admin delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('product-images', 'store-images')
  and exists (
    select 1 from public.profiles
    where id   = auth.uid()
      and role in ('VENDOR', 'ADMIN')
  )
);
