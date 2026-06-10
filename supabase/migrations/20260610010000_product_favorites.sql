-- =============================================================================
-- Product favorites / saved items.
-- Users can only read and manage their own saved products. Products remain
-- governed by product RLS when joined from the client.
-- =============================================================================

create table if not exists public.product_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists product_favorites_user_created_idx
  on public.product_favorites(user_id, created_at desc);

create index if not exists product_favorites_product_idx
  on public.product_favorites(product_id);

alter table public.product_favorites enable row level security;

drop policy if exists "product favorites select own" on public.product_favorites;
create policy "product favorites select own"
on public.product_favorites
for select
using (user_id = auth.uid());

drop policy if exists "product favorites insert own" on public.product_favorites;
create policy "product favorites insert own"
on public.product_favorites
for insert
with check (user_id = auth.uid());

drop policy if exists "product favorites delete own" on public.product_favorites;
create policy "product favorites delete own"
on public.product_favorites
for delete
using (user_id = auth.uid());
