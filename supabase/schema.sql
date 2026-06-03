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
  price numeric not null,
  original_price numeric default 0,
  image text not null,
  category text not null,
  unit text default 'piece',
  stock integer not null default 0,
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
    case
      when new.raw_user_meta_data->>'role' = 'VENDOR' then 'VENDOR'::public.user_role
      else 'CUSTOMER'::public.user_role
    end
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
  or exists (
    select 1 from public.delivery_partners dp
    where dp.id = delivery_partner_id
    and dp.auth_user_id = auth.uid()
  )
);

create policy "orders insert own"
on public.orders
for insert
with check (user_id = auth.uid());

create policy "orders update relevant"
on public.orders
for update
using (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.stores s
    where s.id = store_id
    and s.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.delivery_partners dp
    where dp.id = delivery_partner_id
    and dp.auth_user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.stores s
    where s.id = store_id
    and s.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.delivery_partners dp
    where dp.id = delivery_partner_id
    and dp.auth_user_id = auth.uid()
  )
);

-- DELIVERY PARTNERS
create policy "delivery partners admin or self"
on public.delivery_partners
for select
using (public.is_admin() or auth_user_id = auth.uid());

create policy "delivery partners admin manage"
on public.delivery_partners
for all
using (public.is_admin())
with check (public.is_admin());
