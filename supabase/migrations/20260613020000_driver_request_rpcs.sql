-- ============================================================
-- Migration: driver_request_rpcs (20260613020000)
--
-- Adds named single-action entry points for the driver
-- accept/reject workflow.  These are thin wrappers around
-- respond_to_delivery_request() (20260613010000) so the client
-- service layer can call cleanly-named, single-purpose RPCs.
--
-- All concurrency, validation, and side-effect logic lives in
-- respond_to_delivery_request():
--   • FOR UPDATE row lock prevents two-driver race
--   • unique partial index on (order_id) WHERE accepted is the
--     last-resort DB guard
--   • is_active, expiry, and ownership checks all enforced
-- ============================================================

-- accept_delivery_request ----------------------------------
-- Assigns the order to the calling driver, generates delivery
-- OTP, cancels sibling pending requests, notifies customer and
-- admins.
create or replace function public.accept_delivery_request(
  request_uuid uuid
)
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

-- reject_delivery_request ----------------------------------
-- Marks the request rejected, stores the optional reason,
-- notifies admins so they can re-dispatch.
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

-- ============================================================
-- Testing checklist
--
-- 1. Driver accepts own pending request:
--    select accept_delivery_request('<request_uuid>');
--    → no error; orders.delivery_partner_id set; request status = accepted
--
-- 2. Driver cannot accept a second time:
--    select accept_delivery_request('<request_uuid>');
--    → ERROR: Request is no longer pending (current status: accepted)
--
-- 3. Race condition guard — two drivers accept same request:
--    Transaction A: BEGIN; select accept_delivery_request('<id>');
--    Transaction B (concurrent): select accept_delivery_request('<id>');
--    → Transaction B blocks until A commits, then hits
--      "Request is no longer pending" error
--
-- 4. Race condition guard — two requests for same order both accepted:
--    Even if two separate requests exist for the same order, the
--    partial unique index delivery_requests_one_accepted_per_order
--    on (order_id) WHERE status = 'accepted' prevents the second
--    accept from committing.
--
-- 5. Driver rejects with reason:
--    select reject_delivery_request('<id>', 'Too far away');
--    select reject_reason, status from delivery_requests where id = '<id>';
--    → reject_reason = 'Too far away', status = 'rejected'
--
-- 6. Driver cannot reject another driver's request:
--    select reject_delivery_request('<other_driver_request_id>');
--    → ERROR: Not authorized: this request was not sent to you
--
-- 7. Expired request cannot be accepted:
--    (set expires_at = now() - interval '1 minute' for test)
--    select accept_delivery_request('<id>');
--    → ERROR: This delivery request has expired
-- ============================================================
