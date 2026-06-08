-- Guilt_ marketplace — Supabase Postgres schema, RLS, triggers, and helper functions.
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('CUSTOMER', 'VENDOR', 'ADMIN');
create type public.store_status as enum ('PENDING', 'APPROVED', 'SUSPENDED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null unique,
  phone text default '',
  avatar text default '',
  role public.user_role not null default 'CUSTOMER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  address text not null,
  city text not null,
  state text not null,
  zip text default '',
  is_default boolean not null default false,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text default '',
  phone text default '',
  email text default '',
  logo text default '',
  cover_image text default '',
  address text not null,
  city text not null,
  state text not null,
  zip text default '',
  lat double precision,
  lng double precision,
  categories text[] not null default '{}',
  status public.store_status not null default 'PENDING',
  is_open boolean not null default true,
  delivery_radius numeric not null default 5,
  delivery_fee numeric not null default 1.99,
  min_order numeric not null default 0,
  commission_rate numeric not null default 0.15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  name text not null,
  description text default '',
  images jsonb not null default '[]'::jsonb,
  specifications text default '',
  price numeric not null check (price >= 0),
  original_price numeric default 0 check (original_price >= 0),
  image text not null,
  category text not null,
  unit text default 'piece',
  stock integer not null default 0 check (stock >= 0),
  is_organic boolean not null default false,
  is_active boolean not null default true,
  rating numeric default 0,
  review_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_partners (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  phone text not null,
  avatar text default '',
  vehicle_type text default 'bike',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  shipping_address jsonb not null default '{}'::jsonb,
  payment_method text not null default 'card',
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  tax numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'Placed',
  status_history jsonb not null default '[]'::jsonb,
  delivery_partner_id uuid references public.delivery_partners(id) on delete set null,
  delivery_otp text default '',
  live_location jsonb,
  is_paid boolean not null default false,
  stripe_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stores_owner_id_idx on public.stores(owner_id);
create index stores_status_open_idx on public.stores(status, is_open);
create index products_store_id_idx on public.products(store_id);
create index products_public_idx on public.products(is_active, stock, category);
create index orders_user_id_idx on public.orders(user_id);
create index orders_store_id_idx on public.orders(store_id);
create index orders_delivery_partner_id_idx on public.orders(delivery_partner_id);
create index orders_status_idx on public.orders(status);
create index orders_created_at_idx on public.orders(created_at desc);
create index addresses_user_id_idx on public.addresses(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger addresses_set_updated_at before update on public.addresses for each row execute function public.set_updated_at();
create trigger stores_set_updated_at before update on public.stores for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger delivery_partners_set_updated_at before update on public.delivery_partners for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();

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
    -- Always start as CUSTOMER; role is upgraded via becomeVendor() after store
    -- application. Never trust raw_user_meta_data for role assignment — anyone
    -- can pass {"role":"VENDOR"} in signUp() metadata.
    'CUSTOMER'::public.user_role
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'ADMIN'
  );
$$;

create or replace function public.is_vendor_for_store(store_uuid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.stores
    where id = store_uuid
    and owner_id = auth.uid()
  );
$$;

-- SECURITY DEFINER helpers used inside RLS policies to break the mutual
-- recursion between orders and delivery_partners policies. Because they run as
-- the function owner they bypass RLS on the queried tables, so a policy on one
-- table no longer triggers the other table's policy.
create or replace function public.is_assigned_partner(p_partner_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.delivery_partners dp
    where dp.id = p_partner_id
      and dp.auth_user_id = auth.uid()
  );
$$;

grant execute on function public.is_assigned_partner(uuid) to authenticated;

create or replace function public.can_view_partner(p_partner_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.delivery_partner_id = p_partner_id
      and o.user_id = auth.uid()
  ) or exists (
    select 1 from public.orders o
    join public.stores s on s.id = o.store_id
    where o.delivery_partner_id = p_partner_id
      and s.owner_id = auth.uid()
  );
$$;

grant execute on function public.can_view_partner(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.delivery_partners enable row level security;
alter table public.orders enable row level security;

-- PROFILES
create policy "profiles select own or admin"
on public.profiles
for select
using (id = auth.uid() or public.is_admin());

create policy "profiles update own"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- ADDRESSES
create policy "addresses owner or admin"
on public.addresses
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- STORES
create policy "stores public approved or owner or admin"
on public.stores
for select
using (
  (status = 'APPROVED' and is_open = true)
  or owner_id = auth.uid()
  or public.is_admin()
);

create policy "stores insert own application"
on public.stores
for insert
with check (owner_id = auth.uid());

create policy "stores update own or admin"
on public.stores
for update
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy "stores delete admin only"
on public.stores
for delete
using (public.is_admin());

-- PRODUCTS
create policy "products public active approved or owner or admin"
on public.products
for select
using (
  (
    is_active = true
    and stock > 0
    and (
      store_id is null
      or exists (
        select 1 from public.stores s
        where s.id = store_id
        and s.status = 'APPROVED'
        and s.is_open = true
      )
    )
  )
  or public.is_admin()
  or exists (
    select 1 from public.stores s
    where s.id = store_id
    and s.owner_id = auth.uid()
  )
);

create policy "products insert own approved store or admin"
on public.products
for insert
with check (
  public.is_admin()
  or exists (
    select 1 from public.stores s
    where s.id = store_id
    and s.owner_id = auth.uid()
    and s.status = 'APPROVED'
  )
);

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

create policy "products update own store or admin"
on public.products
for update
using (
  public.is_admin()
  or exists (
    select 1 from public.stores s
    where s.id = store_id
    and s.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.stores s
    where s.id = store_id
    and s.owner_id = auth.uid()
  )
);

-- ORDERS
create policy "orders select relevant"
on public.orders
for select
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.stores s
    where s.id = store_id
    and s.owner_id = auth.uid()
  )
  or public.is_assigned_partner(delivery_partner_id)
);

-- No INSERT policy: orders are created exclusively via the place_order() RPC
-- (SECURITY DEFINER), which validates stock, computes totals, and decrements
-- inventory atomically. Allowing direct inserts would bypass all those checks.

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

-- DELIVERY PARTNERS
-- Admins and the partner themselves can read; customers and store owners can
-- also read the partner assigned to one of their orders (for tracking/pickup).
create policy "delivery partners admin or self or linked"
on public.delivery_partners
for select
using (
  public.is_admin()
  or auth_user_id = auth.uid()
  or public.can_view_partner(id)
);

create policy "delivery partners admin manage"
on public.delivery_partners
for all
using (public.is_admin())
with check (public.is_admin());

-- Public product visibility view: only active, in-stock products from an
-- approved & open store (or legacy platform products with no store). Uses
-- security_invoker so the caller's RLS on products/stores still applies.
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

-- Prevent role self-escalation. Admins may set any role; a user may only
-- upgrade themselves from CUSTOMER to VENDOR (the store-application flow).
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if public.is_admin() then
      return new;
    end if;
    if old.id = auth.uid() and old.role = 'CUSTOMER' and new.role = 'VENDOR' then
      return new;
    end if;
    raise exception 'Not allowed to change role';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute function public.prevent_role_escalation();

-- Secure OTP delivery completion: validates the caller is the assigned partner
-- and the OTP matches, without exposing the OTP through normal reads.
create or replace function public.complete_delivery(order_uuid uuid, otp_input text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.orders%rowtype;
begin
  select * into ord from public.orders where id = order_uuid;
  if ord.id is null then
    raise exception 'Order not found';
  end if;
  if not exists (
    select 1 from public.delivery_partners dp
    where dp.id = ord.delivery_partner_id
    and dp.auth_user_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;
  if ord.status in ('Delivered', 'Cancelled') then
    raise exception 'Invalid request';
  end if;
  if ord.delivery_otp is distinct from otp_input then
    raise exception 'Invalid OTP';
  end if;
  update public.orders
  set status = 'Delivered',
      delivery_otp = '',
      status_history = coalesce(status_history, '[]'::jsonb)
        || jsonb_build_object('status', 'Delivered', 'note', 'Delivered by partner', 'timestamp', now())
  where id = order_uuid;
end;
$$;

-- Cash/test checkout: validates the cart, enforces a single store, computes
-- totals, creates the order for the current user, and decrements stock — all
-- server-side (security definer) so stock updates aren't blocked by RLS.
-- cart: jsonb array of { "product": uuid, "quantity": int }.
-- No tax is applied (tax = 0); total = subtotal + delivery_fee.
-- Stock is decremented atomically with a WHERE stock >= qty guard so concurrent
-- orders cannot drive inventory negative.
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

    -- One-store cart (null store_id = platform product is its own group).
    if not first_set then
      first_store := prod.store_id;
      first_set   := true;
    elsif first_store is distinct from prod.store_id then
      raise exception 'Please checkout items from one store at a time.';
    end if;

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

  if first_store is not null then
    select * into store_rec from public.stores where id = first_store;
    delivery_fee := coalesce(store_rec.delivery_fee, 0);
  else
    delivery_fee := 0;
  end if;

  -- No tax; total = subtotal + delivery_fee only.
  total := round(subtotal + delivery_fee, 2);

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

  -- Atomically decrement stock. WHERE stock >= qty prevents negative inventory
  -- under concurrent checkouts; 0 rows affected means another order already
  -- consumed the stock, so we roll back everything including the insert above.
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
