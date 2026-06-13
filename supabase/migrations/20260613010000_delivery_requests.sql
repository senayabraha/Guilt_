-- ============================================================
-- Migration: delivery_requests (20260613010000)
--
-- Adds the delivery_requests table, RLS policies, and RPCs
-- for the vendor/admin dispatch → driver accept/reject workflow.
--
-- Design notes:
-- * No direct INSERT/UPDATE/DELETE policies for non-admins.
--   All driver mutations go through security-definer RPCs so
--   validation cannot be bypassed.
-- * Admin gets a "manage all" policy (same pattern as
--   delivery_partners) so the admin panel can cancel requests
--   via direct Supabase client calls.
-- * order_snapshot (jsonb) captures basic order info at request-
--   creation time.  This lets the driver read what they're
--   accepting without needing SELECT on the orders table
--   (which would trigger orders→delivery_requests RLS recursion).
-- * A partial unique index prevents two concurrently-accepted
--   requests for the same order, acting as a DB-level guard
--   against race conditions.
-- ============================================================

-- 1. Table -------------------------------------------------
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

-- 2. Indexes -----------------------------------------------
create index delivery_requests_order_id_idx
  on public.delivery_requests(order_id);

create index delivery_requests_partner_status_idx
  on public.delivery_requests(delivery_partner_id, status);

-- Partial index — only pending rows have a meaningful expires_at
create index delivery_requests_status_expires_idx
  on public.delivery_requests(status, expires_at)
  where status = 'pending';

-- Prevents two concurrently-accepted requests for the same order.
-- This is the last line of defence if two drivers race to accept.
create unique index delivery_requests_one_accepted_per_order
  on public.delivery_requests(order_id)
  where status = 'accepted';

-- 3. Triggers ----------------------------------------------
create trigger delivery_requests_set_updated_at
before update on public.delivery_requests
for each row execute function public.set_updated_at();

-- 4. RLS ---------------------------------------------------
alter table public.delivery_requests enable row level security;

-- SELECT: admin | targeted driver | vendor of the order's store.
-- Customers have no access (secure by default — absent = denied).
-- Recursion analysis:
--   delivery_requests → orders (orders RLS fires) → is_assigned_partner()
--   (security definer, no RLS on delivery_partners).  No cycle.
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

-- Admin: full access for cancel / manual overrides from the admin panel.
create policy "delivery requests admin manage"
on public.delivery_requests
for all
using  (public.is_admin())
with check (public.is_admin());

-- 5. Realtime ----------------------------------------------
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

-- 6. RPC: create_delivery_request --------------------------
-- Admin or vendor dispatches a specific driver to an order.
-- Validates: caller role, order state, partner active status,
-- no duplicate active request, then notifies the driver.
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
  -- Validate caller is admin or vendor
  select role into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role not in ('ADMIN', 'VENDOR') then
    raise exception 'Only admins and vendors can create delivery requests';
  end if;

  -- Load order
  select * into ord from public.orders where id = order_uuid;
  if ord.id is null then
    raise exception 'Order not found';
  end if;
  if ord.status in ('Delivered', 'Cancelled') then
    raise exception 'Cannot dispatch a delivered or cancelled order';
  end if;

  -- Vendor must own the order's store
  if caller_role = 'VENDOR' then
    if not exists (
      select 1 from public.stores s
      where s.id = ord.store_id and s.owner_id = auth.uid()
    ) then
      raise exception 'Not authorized: you do not own this order''s store';
    end if;
  end if;

  -- Load partner
  select * into dp from public.delivery_partners where id = partner_uuid;
  if dp.id is null then
    raise exception 'Delivery partner not found';
  end if;
  if not dp.is_active then
    raise exception 'Delivery partner account is inactive';
  end if;

  -- No duplicate active request for same order + partner
  if exists (
    select 1 from public.delivery_requests
    where order_id           = order_uuid
      and delivery_partner_id = partner_uuid
      and status in ('pending', 'accepted')
  ) then
    raise exception 'An active request already exists for this driver and order';
  end if;

  -- Build snapshot: driver-visible order info without needing orders SELECT
  select * into st from public.stores where id = ord.store_id;
  snap := jsonb_build_object(
    'storeId',      coalesce(ord.store_id::text, ''),
    'storeName',    coalesce(st.name, 'Unknown store'),
    'storeAddress', coalesce(st.address || ', ' || st.city, ''),
    'itemCount',    jsonb_array_length(ord.items),
    'total',        ord.total,
    'deliveryArea', coalesce(
                      ord.shipping_address->>'state',
                      ord.shipping_address->>'city',
                      ''
                    )
  );

  -- Insert request
  insert into public.delivery_requests (
    order_id,
    delivery_partner_id,
    requested_by,
    requested_by_role,
    status,
    order_snapshot,
    expires_at
  ) values (
    order_uuid,
    partner_uuid,
    auth.uid(),
    caller_role::text,
    'pending',
    snap,
    case
      when expires_minutes > 0
      then now() + (expires_minutes || ' minutes')::interval
      else null
    end
  )
  returning id into new_request_id;

  -- Notify driver
  select auth_user_id into partner_user
  from public.delivery_partners
  where id = partner_uuid;

  if partner_user is not null then
    perform public.insert_notification(
      partner_user,
      'DELIVERY',
      'delivery.new_request',
      'New delivery request',
      'You have a new delivery request for order #'
        || upper(right(order_uuid::text, 6)) || '.',
      'delivery_request',
      new_request_id
    );
  end if;

  return new_request_id;
end;
$$;

grant execute on function public.create_delivery_request(uuid, uuid, integer) to authenticated;

-- 7. RPC: respond_to_delivery_request ----------------------
-- Driver accepts or rejects a pending request.
-- On accept: marks request accepted, cancels sibling pending
-- requests for the same order, assigns the driver to the order
-- (sets delivery_partner_id, generates OTP, advances status to
-- Assigned if applicable), and notifies customer + admins.
-- On reject: marks rejected, notifies admins for re-dispatch.
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

  -- Caller must be a driver
  select * into dp
  from public.delivery_partners
  where auth_user_id = auth.uid();

  if dp.id is null then
    raise exception 'Delivery partner record not found for this user';
  end if;

  -- Lock the request row to prevent duplicate-accept races
  select * into req
  from public.delivery_requests
  where id = request_uuid
  for update;

  if req.id is null then
    raise exception 'Delivery request not found';
  end if;

  -- Must be the targeted driver
  if req.delivery_partner_id is distinct from dp.id then
    raise exception 'Not authorized: this request was not sent to you';
  end if;

  -- Must still be pending
  if req.status <> 'pending' then
    raise exception 'Request is no longer pending (current status: %)', req.status;
  end if;

  -- Auto-expire and surface a clear error
  if req.expires_at is not null and req.expires_at < now() then
    update public.delivery_requests
    set status = 'expired'
    where id = request_uuid;
    raise exception 'This delivery request has expired';
  end if;

  short_id := upper(right(req.order_id::text, 6));

  -- ── Accept path ─────────────────────────────────────────
  if response = 'accepted' then
    new_otp := floor(random() * 900000 + 100000)::int::text;

    -- Mark this request accepted
    update public.delivery_requests
    set status       = 'accepted',
        responded_at = now()
    where id = request_uuid;

    -- Cancel sibling pending requests for the same order (if any)
    update public.delivery_requests
    set status = 'cancelled'
    where order_id = req.order_id
      and id       <> request_uuid
      and status   = 'pending';

    -- Assign driver to the order
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
          || jsonb_build_object(
               'status',    'Assigned',
               'note',      'Driver accepted delivery request',
               'actor',     'delivery_partner',
               'timestamp', now()
             )
    where id = req.order_id;

    -- Notify customer
    perform public.insert_notification(
      ord.user_id,
      'CUSTOMER',
      'customer.delivery_assigned',
      'Delivery partner assigned',
      'A delivery partner has been assigned to your order #' || short_id || '.',
      'order',
      req.order_id
    );

    -- Notify all admins
    for admin_rec in
      select id from public.profiles where role = 'ADMIN'
    loop
      perform public.insert_notification(
        admin_rec.id,
        'ADMIN',
        'admin.delivery_request_accepted',
        'Driver accepted request',
        dp.name || ' accepted the delivery request for order #' || short_id || '.',
        'delivery_request',
        request_uuid
      );
    end loop;

  -- ── Reject path ─────────────────────────────────────────
  else
    update public.delivery_requests
    set status        = 'rejected',
        responded_at  = now(),
        reject_reason = coalesce(p_reject_reason, '')
    where id = request_uuid;

    -- Notify all admins for re-dispatch
    for admin_rec in
      select id from public.profiles where role = 'ADMIN'
    loop
      perform public.insert_notification(
        admin_rec.id,
        'ADMIN',
        'admin.delivery_request_rejected',
        'Driver rejected request',
        dp.name || ' rejected the request for order #' || short_id || '.'
          || case
               when p_reject_reason is not null and trim(p_reject_reason) <> ''
               then ' Reason: ' || p_reject_reason
               else ''
             end,
        'delivery_request',
        request_uuid
      );
    end loop;
  end if;
end;
$$;

grant execute on function public.respond_to_delivery_request(uuid, text, text) to authenticated;

-- 8. RPC: expire_pending_delivery_requests -----------------
-- Batch-expires all pending requests past their expires_at.
-- Safe to call from a Supabase pg_cron job or Edge Function
-- (no auth check needed — it only marks rows expired, never
-- leaks data, and is idempotent).
create or replace function public.expire_pending_delivery_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.delivery_requests
  set status = 'expired'
  where status     = 'pending'
    and expires_at is not null
    and expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.expire_pending_delivery_requests() to authenticated;

-- ============================================================
-- QA / Acceptance-criteria checklist
-- (run in Supabase SQL editor with appropriate role context)
--
-- 1. Table exists, constraint rejects invalid status:
--    insert into delivery_requests (..., status = 'invalid') → violates check
--
-- 2. No two accepted requests for the same order:
--    insert a second accepted row → violates
--    delivery_requests_one_accepted_per_order unique index
--
-- 3. Admin can create a request (caller_role = 'ADMIN'):
--    select create_delivery_request('<order_uuid>', '<partner_uuid>', 10);
--    → returns new request UUID
--
-- 4. Driver can read their own pending request:
--    as driver auth user:
--    select * from delivery_requests where id = '<request_uuid>';
--    → 1 row
--
-- 5. Driver cannot read another driver's request:
--    as different driver auth user:
--    select * from delivery_requests where id = '<request_uuid>';
--    → 0 rows
--
-- 6. Driver accepts request:
--    select respond_to_delivery_request('<request_uuid>', 'accepted');
--    select status from delivery_requests where id = '<request_uuid>';
--    → 'accepted'
--    select delivery_partner_id, status from orders where id = '<order_uuid>';
--    → delivery_partner_id set, status = 'Assigned'
--
-- 7. Driver cannot accept an already-accepted request:
--    select respond_to_delivery_request('<request_uuid>', 'accepted');
--    → ERROR: Request is no longer pending
--
-- 8. Vendor cannot create request for another store's order:
--    as vendor auth user owning store B, calling with order from store A:
--    → ERROR: Not authorized: you do not own this order's store
--
-- 9. Expiry works:
--    insert a pending request with expires_at = now() - interval '1 minute'
--    select expire_pending_delivery_requests(); → 1
--    select status from delivery_requests where id = '<id>'; → 'expired'
--
-- 10. Existing order flow unaffected:
--     place_order / updateOrderStatus / driver RPCs all still work
--     (no schema changes to orders or delivery_partners)
-- ============================================================
