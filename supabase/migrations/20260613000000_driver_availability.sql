-- ============================================================
-- Migration: driver_availability
-- Adds driver-controlled online/offline availability to
-- delivery_partners, distinct from is_active (admin-controlled).
--
-- RLS note: drivers cannot update delivery_partners directly
-- (the "admin manage" policy covers all DML for admins only).
-- Instead, set_driver_availability() is a security-definer RPC
-- that validates the caller and updates only the three new
-- availability columns — it cannot touch is_active or other
-- admin-managed fields.
-- ============================================================

-- 1. Schema columns
alter table public.delivery_partners
  add column if not exists availability_status text not null default 'offline'
    check (availability_status in ('offline', 'online', 'busy', 'unavailable')),
  add column if not exists last_seen_at      timestamptz,
  add column if not exists last_available_at timestamptz;

-- 2. RPC: driver sets their own availability
--    Enforces:
--      - Caller must own a delivery_partners row (auth_user_id = auth.uid())
--      - is_active must be true (admin-approval gate remains separate)
--      - Only updates availability_status, last_seen_at, last_available_at
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
-- QA checklist (to verify in Supabase SQL editor):
--
-- 1. Active driver can go online:
--    select set_driver_availability('online');  -- as driver auth user
--    select availability_status, last_seen_at from delivery_partners
--      where auth_user_id = auth.uid();
--    => availability_status = 'online', last_seen_at is set
--
-- 2. Active driver can go offline:
--    select set_driver_availability('offline');
--    => availability_status = 'offline'
--
-- 3. Inactive driver cannot go online (is_active = false):
--    update delivery_partners set is_active = false where id = '<driver_id>';
--    select set_driver_availability('online');  -- as that driver
--    => ERROR: Your account is inactive.
--
-- 4. Driver cannot update is_active via direct SQL (RLS):
--    update delivery_partners set is_active = true
--      where auth_user_id = auth.uid();
--    => 0 rows affected (blocked by "admin manage" policy)
--
-- 5. Admin can read availability for all drivers:
--    select id, name, availability_status, last_seen_at
--      from delivery_partners;
--    => All rows visible (is_admin() = true)
--
-- 6. Availability persists across sessions:
--    set_driver_availability('online'), sign out, sign back in,
--    getMyPartner() => availabilityStatus = 'online'
-- ============================================================
