-- =============================================================================
-- Migration: product image/spec columns + RLS recursion fix
-- =============================================================================
-- WHAT THIS DOES
--   1. Adds `images` (jsonb array of URLs; images[0] is the primary image) and
--      `specifications` (text) columns to public.products.
--   2. Backfills `images` from the legacy single `image` column.
--   3. Recreates public.visible_products so the new columns are exposed (the
--      view was defined with `select p.*`, whose column list is frozen at
--      creation time and must be refreshed).
--   4. Adds two SECURITY DEFINER helper functions, is_assigned_partner() and
--      can_view_partner(), and rewrites the orders / delivery_partners policies
--      to call them. This breaks the mutual recursion that caused the runtime
--      error "infinite recursion detected in policy for relation
--      delivery_partners": the orders policy used to inline-query
--      delivery_partners (and vice-versa), so each policy triggered the other's
--      RLS forever. The helpers run as their owner and bypass RLS on the
--      queried tables, cutting the cycle.
--
-- SAFE TO RE-RUN: every statement is idempotent (add column if not exists,
-- create or replace, drop policy if exists before create). Paste it into the
-- Supabase SQL editor on the existing hosted database.
-- =============================================================================

-- 1. New product columns ------------------------------------------------------
alter table public.products
  add column if not exists images jsonb not null default '[]'::jsonb;

alter table public.products
  add column if not exists specifications text default '';

-- 2. Backfill images from the legacy single image column ----------------------
update public.products
set images = jsonb_build_array(image)
where (images is null or images = '[]'::jsonb)
  and image is not null
  and image <> '';

-- 3. Recreate visible_products so it includes the new columns -----------------
create or replace view public.visible_products
with (security_invoker = on) as
  select p.*
  from public.products p
  left join public.stores s on s.id = p.store_id
  where p.is_active = true
    and p.stock > 0
    and (p.store_id is null or (s.status = 'APPROVED' and s.is_open = true));

grant select on public.visible_products to anon, authenticated;

-- 4. SECURITY DEFINER helpers to break the orders <-> delivery_partners cycle --
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

-- 5. Rewrite the three recursive policies to use the helpers ------------------
drop policy if exists "orders select relevant" on public.orders;
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

drop policy if exists "orders update relevant" on public.orders;
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
  or public.is_assigned_partner(delivery_partner_id)
)
with check (
  user_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.stores s
    where s.id = store_id
    and s.owner_id = auth.uid()
  )
  or public.is_assigned_partner(delivery_partner_id)
);

drop policy if exists "delivery partners admin or self or linked" on public.delivery_partners;
create policy "delivery partners admin or self or linked"
on public.delivery_partners
for select
using (
  public.is_admin()
  or auth_user_id = auth.uid()
  or public.can_view_partner(id)
);
