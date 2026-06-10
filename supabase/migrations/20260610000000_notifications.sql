-- =============================================================================
-- In-app notifications for marketplace events.
-- Scope: DB-backed notifications with RLS, explicit event RPCs, and realtime-
-- friendly table shape. No push notifications.
-- =============================================================================

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

create index if not exists notifications_user_created_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, read_at)
  where read_at is null;

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

alter table public.notifications enable row level security;

drop policy if exists "notifications select own" on public.notifications;
create policy "notifications select own"
on public.notifications
for select
using (user_id = auth.uid());

drop policy if exists "notifications update own read state" on public.notifications;
create policy "notifications update own read state"
on public.notifications
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- No public insert/delete policies. Notifications are created through the
-- SECURITY DEFINER event functions below so clients cannot notify arbitrary users.

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
  if ord.id is null then
    raise exception 'Order not found';
  end if;
  if ord.user_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  short_id := upper(right(ord.id::text, 6));

  select owner_id into store_owner
  from public.stores
  where id = ord.store_id;

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
  if ord.id is null then
    raise exception 'Order not found';
  end if;

  if not (
    public.is_admin()
    or exists (
      select 1 from public.stores s
      where s.id = ord.store_id and s.owner_id = auth.uid()
    )
    or public.is_assigned_partner(ord.delivery_partner_id)
  ) then
    raise exception 'Not authorized';
  end if;

  -- Avoid noisy updates for statuses that are mostly internal.
  if new_status not in (
    'Confirmed',
    'Preparing',
    'Partially Available',
    'Ready for Pickup',
    'Assigned',
    'Picked Up',
    'Out for Delivery',
    'Delivered',
    'Cancelled'
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
    ord.user_id,
    'CUSTOMER',
    'customer.order_status',
    title,
    message,
    'order',
    ord.id
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
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into ord from public.orders where id = order_uuid;
  if ord.id is null then
    raise exception 'Order not found';
  end if;

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
  if st.id is null then
    raise exception 'Store not found';
  end if;
  if st.owner_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

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
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into st from public.stores where id = store_uuid;
  if st.id is null then
    raise exception 'Store not found';
  end if;

  if new_status not in ('APPROVED', 'SUSPENDED') then
    return;
  end if;

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
