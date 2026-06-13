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

-- IN-APP NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  audience text not null default 'CUSTOMER'
    check (audience in ('CUSTOMER', 'VENDOR', 'ADMIN', 'DELIVERY')),
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.product_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, read_at)
  where read_at is null;

create index if not exists product_favorites_user_created_idx
  on public.product_favorites(user_id, created_at desc);

create index if not exists product_favorites_product_idx
  on public.product_favorites(product_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

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
alter table public.notifications enable row level security;
alter table public.product_favorites enable row level security;

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

-- NOTIFICATIONS
create policy "notifications select own"
on public.notifications
for select
using (user_id = auth.uid());

create policy "notifications update own read state"
on public.notifications
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- PRODUCT FAVORITES
create policy "product favorites select own"
on public.product_favorites
for select
using (user_id = auth.uid());

create policy "product favorites insert own"
on public.product_favorites
for insert
with check (user_id = auth.uid());

create policy "product favorites delete own"
on public.product_favorites
for delete
using (user_id = auth.uid());

create or replace function public.insert_notification(
  target_user_id uuid,
  target_audience text,
  notification_type text,
  notification_title text,
  notification_message text,
  notification_entity_type text default null,
  notification_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_user_id is null then
    return;
  end if;

  insert into public.notifications (
    user_id, audience, type, title, message, entity_type, entity_id
  ) values (
    target_user_id,
    coalesce(target_audience, 'CUSTOMER'),
    notification_type,
    notification_title,
    notification_message,
    notification_entity_type,
    notification_entity_id
  );
end;
$$;

revoke all on function public.insert_notification(uuid, text, text, text, text, text, uuid) from public;

create or replace function public.notify_order_placed(order_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.orders%rowtype;
  store_owner uuid;
  short_id text;
begin
  select * into ord from public.orders where id = order_uuid;
  if ord.id is null then raise exception 'Order not found'; end if;
  if ord.user_id <> auth.uid() then raise exception 'Not authorized'; end if;

  short_id := upper(right(ord.id::text, 6));
  select owner_id into store_owner from public.stores where id = ord.store_id;

  if store_owner is not null then
    perform public.insert_notification(
      store_owner,
      'VENDOR',
      'vendor.new_order',
      'New order received',
      'Order #' || short_id || ' is ready for vendor review.',
      'order',
      ord.id
    );
  end if;
end;
$$;

grant execute on function public.notify_order_placed(uuid) to authenticated;

create or replace function public.notify_order_status_changed(order_uuid uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.orders%rowtype;
  short_id text;
  title text;
  message text;
  store_owner uuid;
begin
  select * into ord from public.orders where id = order_uuid;
  if ord.id is null then raise exception 'Order not found'; end if;

  if not (
    public.is_admin()
    or exists (select 1 from public.stores s where s.id = ord.store_id and s.owner_id = auth.uid())
    or public.is_assigned_partner(ord.delivery_partner_id)
  ) then
    raise exception 'Not authorized';
  end if;

  if new_status not in (
    'Confirmed', 'Preparing', 'Partially Available', 'Ready for Pickup',
    'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered', 'Cancelled'
  ) then
    return;
  end if;

  short_id := upper(right(ord.id::text, 6));
  title := case new_status
    when 'Confirmed' then 'Order confirmed'
    when 'Preparing' then 'Order is being prepared'
    when 'Partially Available' then 'Item availability issue'
    when 'Ready for Pickup' then 'Order is ready for pickup'
    when 'Assigned' then 'Delivery partner assigned'
    when 'Picked Up' then 'Order picked up'
    when 'Out for Delivery' then 'Order is out for delivery'
    when 'Delivered' then 'Order delivered'
    when 'Cancelled' then 'Order cancelled'
    else 'Order updated'
  end;
  message := 'Order #' || short_id || ' status changed to ' || new_status || '.';

  perform public.insert_notification(
    ord.user_id, 'CUSTOMER', 'customer.order_status',
    title, message, 'order', ord.id
  );

  if new_status = 'Cancelled' then
    select owner_id into store_owner from public.stores where id = ord.store_id;
    if store_owner is not null then
      perform public.insert_notification(
        store_owner,
        'VENDOR',
        'vendor.order_cancelled',
        'Order cancelled',
        'Order #' || short_id || ' was cancelled.',
        'order',
        ord.id
      );
    end if;
  end if;
end;
$$;

grant execute on function public.notify_order_status_changed(uuid, text) to authenticated;

create or replace function public.notify_delivery_assigned(order_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.orders%rowtype;
  partner_user uuid;
  short_id text;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into ord from public.orders where id = order_uuid;
  if ord.id is null then raise exception 'Order not found'; end if;

  short_id := upper(right(ord.id::text, 6));
  select auth_user_id into partner_user
  from public.delivery_partners
  where id = ord.delivery_partner_id;

  if partner_user is not null then
    perform public.insert_notification(
      partner_user,
      'DELIVERY',
      'delivery.assigned_order',
      'New delivery assigned',
      'Order #' || short_id || ' has been assigned to you.',
      'order',
      ord.id
    );
  end if;

  perform public.insert_notification(
    ord.user_id,
    'CUSTOMER',
    'customer.delivery_assigned',
    'Delivery partner assigned',
    'A delivery partner has been assigned to order #' || short_id || '.',
    'order',
    ord.id
  );
end;
$$;

grant execute on function public.notify_delivery_assigned(uuid) to authenticated;

create or replace function public.notify_store_pending(store_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  st public.stores%rowtype;
  admin_rec record;
begin
  select * into st from public.stores where id = store_uuid;
  if st.id is null then raise exception 'Store not found'; end if;
  if st.owner_id <> auth.uid() then raise exception 'Not authorized'; end if;

  for admin_rec in select id from public.profiles where role = 'ADMIN'
  loop
    perform public.insert_notification(
      admin_rec.id,
      'ADMIN',
      'admin.pending_store',
      'Store awaiting approval',
      st.name || ' submitted a store application.',
      'store',
      st.id
    );
  end loop;
end;
$$;

grant execute on function public.notify_store_pending(uuid) to authenticated;

create or replace function public.notify_store_status_changed(store_uuid uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  st public.stores%rowtype;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into st from public.stores where id = store_uuid;
  if st.id is null then raise exception 'Store not found'; end if;
  if new_status not in ('APPROVED', 'SUSPENDED') then return; end if;

  perform public.insert_notification(
    st.owner_id,
    'VENDOR',
    'vendor.store_status',
    case when new_status = 'APPROVED' then 'Store approved' else 'Store suspended' end,
    case
      when new_status = 'APPROVED' then st.name || ' is approved and can start selling.'
      else st.name || ' has been suspended. Contact support for help.'
    end,
    'store',
    st.id
  );
end;
$$;

grant execute on function public.notify_store_status_changed(uuid, text) to authenticated;

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

-- ============================================================
-- Driver status-transition RPCs
-- Each function follows the same security pattern as
-- complete_delivery: security definer, explicit caller-is-
-- assigned-partner check, allowed-transition guard, and an
-- appended status_history entry that includes an actor field.
-- ============================================================

-- driver_mark_picked_up: transitions an order from Assigned or
-- Ready for Pickup to Picked Up.
--
-- Allows Assigned → Picked Up because admin may assign a driver
-- to an order that has already been physically prepared but not
-- yet marked Ready for Pickup through the vendor UI.  This
-- assumption should be revisited once vendor-dispatch is live
-- (Phase 3) and vendors control the dispatch trigger.
create or replace function public.driver_mark_picked_up(order_uuid uuid)
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
    raise exception 'Order is already complete';
  end if;
  if ord.status not in ('Assigned', 'Ready for Pickup') then
    raise exception 'Order must be Assigned or Ready for Pickup before pickup can be confirmed';
  end if;
  update public.orders
  set status = 'Picked Up',
      status_history = coalesce(status_history, '[]'::jsonb)
        || jsonb_build_object(
             'status',    'Picked Up',
             'note',      'Order picked up by delivery partner',
             'actor',     'delivery_partner',
             'timestamp', now()
           )
  where id = order_uuid;
end;
$$;

grant execute on function public.driver_mark_picked_up(uuid) to authenticated;

-- driver_mark_out_for_delivery: transitions an order from
-- Picked Up to Out for Delivery.
create or replace function public.driver_mark_out_for_delivery(order_uuid uuid)
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
    raise exception 'Order is already complete';
  end if;
  if ord.status <> 'Picked Up' then
    raise exception 'Order must be Picked Up before it can be marked Out for Delivery';
  end if;
  update public.orders
  set status = 'Out for Delivery',
      status_history = coalesce(status_history, '[]'::jsonb)
        || jsonb_build_object(
             'status',    'Out for Delivery',
             'note',      'Order is out for delivery',
             'actor',     'delivery_partner',
             'timestamp', now()
           )
  where id = order_uuid;
end;
$$;

grant execute on function public.driver_mark_out_for_delivery(uuid) to authenticated;

-- driver_cancel_delivery: cancels a delivery that is currently
-- in an active driver state.  Requires a non-empty reason.
-- Cancellable states: Assigned, Ready for Pickup, Picked Up,
-- Out for Delivery.
create or replace function public.driver_cancel_delivery(order_uuid uuid, cancel_reason text)
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
    raise exception 'Order is already complete';
  end if;
  if ord.status not in ('Assigned', 'Ready for Pickup', 'Picked Up', 'Out for Delivery') then
    raise exception 'Order cannot be cancelled from its current state';
  end if;
  if cancel_reason is null or trim(cancel_reason) = '' then
    raise exception 'Cancellation reason is required';
  end if;
  update public.orders
  set status = 'Cancelled',
      status_history = coalesce(status_history, '[]'::jsonb)
        || jsonb_build_object(
             'status',    'Cancelled',
             'note',      cancel_reason,
             'actor',     'delivery_partner',
             'timestamp', now()
           )
  where id = order_uuid;
end;
$$;

grant execute on function public.driver_cancel_delivery(uuid, text) to authenticated;

-- driver_report_failed_delivery: records a delivery failure
-- after pickup.  The current status model has no dedicated
-- Failed status, so this sets the order to Cancelled with a
-- note that distinguishes it from a voluntary cancellation.
-- Phase 2 should introduce a distinct Failed status and a
-- failure_reason column before this function is used in
-- production.
create or replace function public.driver_report_failed_delivery(order_uuid uuid, failure_reason text)
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
    raise exception 'Order is already complete';
  end if;
  if ord.status not in ('Picked Up', 'Out for Delivery') then
    raise exception 'Delivery failure can only be reported after pickup';
  end if;
  if failure_reason is null or trim(failure_reason) = '' then
    raise exception 'Failure reason is required';
  end if;
  update public.orders
  set status = 'Cancelled',
      status_history = coalesce(status_history, '[]'::jsonb)
        || jsonb_build_object(
             'status',    'Cancelled',
             'note',      'Delivery failed: ' || failure_reason,
             'actor',     'delivery_partner',
             'timestamp', now()
           )
  where id = order_uuid;
end;
$$;

grant execute on function public.driver_report_failed_delivery(uuid, text) to authenticated;

-- ============================================================
-- MIGRATION: driver_availability (20260613000000)
-- ============================================================
alter table public.delivery_partners
  add column if not exists availability_status text not null default 'offline'
    check (availability_status in ('offline', 'online', 'busy', 'unavailable')),
  add column if not exists last_seen_at      timestamptz,
  add column if not exists last_available_at timestamptz;

-- security-definer RPC so drivers can update only their own
-- availability fields without touching is_active or any other
-- admin-managed column.
create or replace function public.set_driver_availability(new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  dp public.delivery_partners%rowtype;
begin
  select * into dp
  from public.delivery_partners
  where auth_user_id = auth.uid();

  if dp.id is null then
    raise exception 'Delivery partner record not found for this user';
  end if;

  if not dp.is_active then
    raise exception 'Your account is inactive. Contact admin to reactivate.';
  end if;

  if new_status not in ('offline', 'online', 'busy', 'unavailable') then
    raise exception 'Invalid availability status: %', new_status;
  end if;

  update public.delivery_partners
  set
    availability_status = new_status,
    last_seen_at        = now(),
    last_available_at   = case
                            when new_status = 'online' then now()
                            else last_available_at
                          end
  where id = dp.id;
end;
$$;

grant execute on function public.set_driver_availability(text) to authenticated;

-- ============================================================
-- MIGRATION: delivery_requests (20260613010000)
-- ============================================================

create table public.delivery_requests (
  id                  uuid        primary key default gen_random_uuid(),
  order_id            uuid        not null
    references public.orders(id)           on delete cascade,
  delivery_partner_id uuid
    references public.delivery_partners(id) on delete set null,
  requested_by        uuid
    references public.profiles(id)          on delete set null,
  requested_by_role   text        not null
    check (requested_by_role in ('ADMIN', 'VENDOR')),
  status              text        not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  reject_reason       text,
  order_snapshot      jsonb,
  expires_at          timestamptz,
  responded_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index delivery_requests_order_id_idx
  on public.delivery_requests(order_id);
create index delivery_requests_partner_status_idx
  on public.delivery_requests(delivery_partner_id, status);
create index delivery_requests_status_expires_idx
  on public.delivery_requests(status, expires_at)
  where status = 'pending';
create unique index delivery_requests_one_accepted_per_order
  on public.delivery_requests(order_id)
  where status = 'accepted';

create trigger delivery_requests_set_updated_at
before update on public.delivery_requests
for each row execute function public.set_updated_at();

alter table public.delivery_requests enable row level security;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname  = 'supabase_realtime'
         and schemaname = 'public'
         and tablename  = 'delivery_requests'
     ) then
    alter publication supabase_realtime add table public.delivery_requests;
  end if;
end $$;

create policy "delivery requests select allowed"
on public.delivery_requests
for select
using (
  public.is_admin()
  or public.is_assigned_partner(delivery_partner_id)
  or exists (
    select 1
    from public.orders o
    join public.stores s on s.id = o.store_id
    where o.id = delivery_requests.order_id
      and s.owner_id = auth.uid()
  )
);

create policy "delivery requests admin manage"
on public.delivery_requests
for all
using  (public.is_admin())
with check (public.is_admin());

create or replace function public.create_delivery_request(
  order_uuid      uuid,
  partner_uuid    uuid,
  expires_minutes integer default 10
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ord             public.orders%rowtype;
  dp              public.delivery_partners%rowtype;
  st              public.stores%rowtype;
  caller_role     public.user_role;
  partner_user    uuid;
  new_request_id  uuid;
  snap            jsonb;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role not in ('ADMIN', 'VENDOR') then
    raise exception 'Only admins and vendors can create delivery requests';
  end if;

  select * into ord from public.orders where id = order_uuid;
  if ord.id is null then raise exception 'Order not found'; end if;
  if ord.status in ('Delivered', 'Cancelled') then
    raise exception 'Cannot dispatch a delivered or cancelled order';
  end if;

  if caller_role = 'VENDOR' then
    if not exists (
      select 1 from public.stores s
      where s.id = ord.store_id and s.owner_id = auth.uid()
    ) then
      raise exception 'Not authorized: you do not own this order''s store';
    end if;
  end if;

  select * into dp from public.delivery_partners where id = partner_uuid;
  if dp.id is null then raise exception 'Delivery partner not found'; end if;
  if not dp.is_active then raise exception 'Delivery partner account is inactive'; end if;

  if exists (
    select 1 from public.delivery_requests
    where order_id           = order_uuid
      and delivery_partner_id = partner_uuid
      and status in ('pending', 'accepted')
  ) then
    raise exception 'An active request already exists for this driver and order';
  end if;

  select * into st from public.stores where id = ord.store_id;
  snap := jsonb_build_object(
    'storeId',      coalesce(ord.store_id::text, ''),
    'storeName',    coalesce(st.name, 'Unknown store'),
    'storeAddress', coalesce(st.address || ', ' || st.city, ''),
    'itemCount',    jsonb_array_length(ord.items),
    'total',        ord.total,
    'deliveryArea', coalesce(ord.shipping_address->>'state', ord.shipping_address->>'city', '')
  );

  insert into public.delivery_requests (
    order_id, delivery_partner_id, requested_by, requested_by_role,
    status, order_snapshot, expires_at
  ) values (
    order_uuid, partner_uuid, auth.uid(), caller_role::text, 'pending', snap,
    case when expires_minutes > 0
         then now() + (expires_minutes || ' minutes')::interval
         else null end
  )
  returning id into new_request_id;

  select auth_user_id into partner_user
  from public.delivery_partners where id = partner_uuid;

  if partner_user is not null then
    perform public.insert_notification(
      partner_user, 'DELIVERY', 'delivery.new_request', 'New delivery request',
      'You have a new delivery request for order #' || upper(right(order_uuid::text, 6)) || '.',
      'delivery_request', new_request_id
    );
  end if;

  return new_request_id;
end;
$$;

grant execute on function public.create_delivery_request(uuid, uuid, integer) to authenticated;

create or replace function public.respond_to_delivery_request(
  request_uuid    uuid,
  response        text,
  p_reject_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req         public.delivery_requests%rowtype;
  dp          public.delivery_partners%rowtype;
  ord         public.orders%rowtype;
  new_otp     text;
  admin_rec   record;
  short_id    text;
begin
  if response not in ('accepted', 'rejected') then
    raise exception 'response must be ''accepted'' or ''rejected''';
  end if;

  select * into dp from public.delivery_partners where auth_user_id = auth.uid();
  if dp.id is null then raise exception 'Delivery partner record not found for this user'; end if;

  select * into req from public.delivery_requests where id = request_uuid for update;
  if req.id is null then raise exception 'Delivery request not found'; end if;

  if req.delivery_partner_id is distinct from dp.id then
    raise exception 'Not authorized: this request was not sent to you';
  end if;

  if req.status <> 'pending' then
    raise exception 'Request is no longer pending (current status: %)', req.status;
  end if;

  if req.expires_at is not null and req.expires_at < now() then
    update public.delivery_requests set status = 'expired' where id = request_uuid;
    raise exception 'This delivery request has expired';
  end if;

  short_id := upper(right(req.order_id::text, 6));

  if response = 'accepted' then
    new_otp := floor(random() * 900000 + 100000)::int::text;

    update public.delivery_requests
    set status = 'accepted', responded_at = now()
    where id = request_uuid;

    update public.delivery_requests
    set status = 'cancelled'
    where order_id = req.order_id and id <> request_uuid and status = 'pending';

    select * into ord from public.orders where id = req.order_id;
    update public.orders
    set delivery_partner_id = dp.id,
        delivery_otp        = new_otp,
        status              = case
                                when ord.status in (
                                  'Placed', 'Confirmed', 'Preparing',
                                  'Partially Available', 'Ready for Pickup'
                                ) then 'Assigned'
                                else ord.status
                              end,
        status_history      = coalesce(status_history, '[]'::jsonb)
          || jsonb_build_object('status', 'Assigned', 'note', 'Driver accepted delivery request',
                                'actor', 'delivery_partner', 'timestamp', now())
    where id = req.order_id;

    perform public.insert_notification(
      ord.user_id, 'CUSTOMER', 'customer.delivery_assigned', 'Delivery partner assigned',
      'A delivery partner has been assigned to your order #' || short_id || '.',
      'order', req.order_id
    );

    for admin_rec in select id from public.profiles where role = 'ADMIN' loop
      perform public.insert_notification(
        admin_rec.id, 'ADMIN', 'admin.delivery_request_accepted', 'Driver accepted request',
        dp.name || ' accepted the delivery request for order #' || short_id || '.',
        'delivery_request', request_uuid
      );
    end loop;

  else
    update public.delivery_requests
    set status = 'rejected', responded_at = now(), reject_reason = coalesce(p_reject_reason, '')
    where id = request_uuid;

    for admin_rec in select id from public.profiles where role = 'ADMIN' loop
      perform public.insert_notification(
        admin_rec.id, 'ADMIN', 'admin.delivery_request_rejected', 'Driver rejected request',
        dp.name || ' rejected the request for order #' || short_id || '.'
          || case when p_reject_reason is not null and trim(p_reject_reason) <> ''
                  then ' Reason: ' || p_reject_reason else '' end,
        'delivery_request', request_uuid
      );
    end loop;
  end if;
end;
$$;

grant execute on function public.respond_to_delivery_request(uuid, text, text) to authenticated;

create or replace function public.expire_pending_delivery_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer;
begin
  update public.delivery_requests
  set status = 'expired'
  where status = 'pending' and expires_at is not null and expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.expire_pending_delivery_requests() to authenticated;

-- ============================================================
-- MIGRATION: driver_request_rpcs (20260613020000)
-- ============================================================

create or replace function public.accept_delivery_request(request_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.respond_to_delivery_request(request_uuid, 'accepted', null);
end;
$$;

grant execute on function public.accept_delivery_request(uuid) to authenticated;

create or replace function public.reject_delivery_request(
  request_uuid  uuid,
  reject_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.respond_to_delivery_request(request_uuid, 'rejected', reject_reason);
end;
$$;

grant execute on function public.reject_delivery_request(uuid, text) to authenticated;
