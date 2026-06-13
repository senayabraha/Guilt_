# Delivery Driver / Delivery Partner System Implementation Plan

Source document used: `docs/delivery-driver-system-analysis.md`.

Requested source filename note: `delivery-driver-system-manager-analysis.md` was not found in the repository during this planning pass. The existing delivery analysis file found and used was `docs/delivery-driver-system-analysis.md`. Any item not proven by that analysis is marked as `Needs verification` instead of treated as fact.

This document is an execution roadmap only. It does not implement code, change schema, update RLS, refactor components, or alter Supabase policies.

---

## 1. Executive Summary

### Current condition

The delivery driver system already exists as a functional early MVP. The current app includes:

- A dedicated delivery login route: `/delivery/login`.
- A delivery dashboard route: `/delivery`.
- A `delivery_partners` table linked to Supabase Auth through `auth_user_id`.
- Admin-created delivery partner accounts through the `admin-create-delivery-partner` Supabase Edge Function.
- Admin partner activation/deactivation through `delivery_partners.is_active`.
- Admin order assignment through `orders.delivery_partner_id`.
- Assigned delivery loading in the driver dashboard.
- Pickup and drop-off information for drivers.
- Google Maps pickup/drop-off links when coordinates exist.
- Driver progress actions for `Picked Up` and `Out for Delivery`.
- OTP-based delivery completion through the secure `complete_delivery` RPC.
- Driver cancellation through the generic `updateOrderStatus(..., "Cancelled")` path.
- Driver location sharing into `orders.live_location`.
- Customer live-location polling and Leaflet map display.
- In-app notification table/RPC foundations.

The system is not yet a complete marketplace dispatch system. It currently behaves like an admin-assigned delivery workflow. Drivers do not browse requests, accept/reject offers, set true working availability, receive realtime request updates in the dashboard, see earnings, or manage verification/profile details. Vendors can prepare orders and mark them ready, but vendors cannot request, assign, track, reassign, or cancel delivery partners from a dedicated dispatch workflow.

### Biggest UX problems

1. `Share Location` can be confused with `Go Online`; it is location sharing, not availability.
2. The driver dashboard does not clearly answer: “Am I waiting for work, assigned to work, or actively delivering?”
3. The driver card UI is useful but not safe enough for real delivery operations because routine actions and cancellation actions are close together.
4. There is no focused active delivery screen with a single next action.
5. There is no incoming request experience, accept/reject flow, or visible request timeout.
6. Vendors cannot dispatch drivers; the vendor flow stops at order preparation/readiness.
7. Admin assignment exists, but assignment state, reassignment, and delivery monitoring are thin.

### Biggest technical risks

1. `orders.status` mixes order lifecycle, vendor prep lifecycle, dispatch lifecycle, driver delivery lifecycle, and customer tracking lifecycle.
2. The broad `orders update relevant` RLS policy allows relevant admins, vendors, and assigned partners to update order rows. Frontend checks restrict driver actions, but direct client calls could bypass intended status flow unless status transitions are moved into server-side RPCs.
3. Driver delivery actions rely partly on generic `updateOrderStatus()` instead of dedicated RPCs, except for `complete_delivery`.
4. `Assigned` can be created by admin assignment but is not included in the active driver delivery filter, creating a possible hidden-assignment bug.
5. `delivery_partners.is_active` is an admin enable/disable flag, not driver availability.
6. Realtime infrastructure is partially present for `notifications`, but delivery dashboard realtime subscriptions are not implemented in the inspected analysis.
7. Location tracking has no explicit stale cutoff, privacy lifecycle, or terminal cleanup.
8. `delivery_otp` exposure requires verification because some service selections use broad `*` patterns.

### Recommended implementation strategy

Use a safe phased plan:

1. Stabilize and harden what exists.
2. Add driver availability and core driver delivery lifecycle.
3. Add vendor dispatch tools.
4. Add realtime updates, notifications, and safer tracking.
5. Expand admin monitoring and driver management.
6. Add earnings, ratings, and performance.

Do not jump directly to automatic dispatch. The current system first needs clear status rules, driver availability, request/accept/reject flow, and server-side transition protection.

---

## 2. Current System Understanding

### Current driver-related routes

| Route | Component | Current behavior | Status |
|---|---|---|---|
| `/delivery/login` | `client/src/pages/delivery/DeliveryLogin.tsx` | Delivery-specific login. Signs in with Supabase, then verifies a linked delivery partner row through `getMyPartner()`. | Exists |
| `/delivery` | `client/src/pages/delivery/DeliveryLayout.tsx` + `client/src/pages/delivery/DeliveryDashboard.tsx` | Driver dashboard. `DeliveryLayout` checks for a linked partner and redirects to `/delivery/login` when missing. | Exists |
| `/delivery/orders/:orderId` | Not found in current analysis | Recommended active delivery/detail route. | Missing |
| `/delivery/history` | Not found in current analysis | Recommended delivery history route. | Missing |
| `/delivery/earnings` | Not found in current analysis | Recommended earnings route. | Missing |
| `/delivery/apply` | Not found in current analysis | Recommended public driver onboarding/application route. | Missing |

### Current driver-facing screens

| Screen | File | Current behavior | Main gap |
|---|---|---|---|
| Delivery login | `client/src/pages/delivery/DeliveryLogin.tsx` | Authenticates and validates partner row. | No driver application/recovery guidance documented. |
| Delivery layout | `client/src/pages/delivery/DeliveryLayout.tsx` | Shows portal shell, partner name, logout. | Local guard instead of shared driver route guard. |
| Delivery dashboard | `client/src/pages/delivery/DeliveryDashboard.tsx` | Shows Active/Completed tabs, assigned orders, location-sharing toggle. | No online/offline, no request queue, no focused active delivery state. |
| Delivery order card | `client/src/components/Delivery/DeliveryOrderCard.tsx` | Shows pickup, drop-off, phone, maps links, status actions. | Dense for real driving; cancellation too close to routine actions. |
| OTP modal | `client/src/components/Delivery/OtpModal.tsx` | Confirms delivery using customer OTP. | No proof-of-delivery extension yet. |
| Cancel modal | `client/src/components/Delivery/CancelModal.tsx` | Captures cancellation reason. | Uses generic status update path; no failure/reassignment workflow. |

### Current vendor dispatch features

Vendor dispatch is not implemented as a dispatch system.

Current vendor delivery-adjacent behavior:

1. Vendor sees orders in `client/src/pages/vendor/VendorOrders.tsx`.
2. Vendor starts preparation.
3. Vendor prepares items in `client/src/pages/vendor/VendorOrderPrepare.tsx`.
4. Vendor marks items as `picked` or `not_available`.
5. `completeOrderPreparation()` sets order to `Ready for Pickup` or `Partially Available`.
6. If partial, `confirmReadyForPickup()` can later set `Ready for Pickup`.
7. Admin assigns a delivery partner from `client/src/pages/admin/AdminOrders.tsx`.

Missing vendor dispatch features:

- Request driver.
- See available/online drivers.
- Manual driver assignment by vendor.
- Driver assignment status.
- Driver accept/reject status.
- Delivery progress panel.
- Reassign/cancel delivery.
- Delivery timeline.

### Current order/delivery status logic

Current statuses found in the analysis:

- `Placed`
- `Confirmed`
- `Preparing`
- `Partially Available`
- `Ready for Pickup`
- `Assigned`
- `Picked Up`
- `Out for Delivery`
- `Delivered`
- `Cancelled`
- `Packed` appears in customer tracking context but is not part of main admin/vendor/driver status options.

Current issue:

- `orders.status` is overloaded.
- It stores vendor/store preparation states, admin assignment states, driver delivery states, customer tracking states, and terminal cancellation/delivery states.
- `Assigned` may be generated by `assignDeliveryPartner()` but omitted from the active driver query filter.

Recommended status direction:

- Short-term: keep `orders.status`, but add dedicated driver RPCs and strict transition validation.
- Medium-term: add `deliveries` and `delivery_requests` tables so `orders.status` can remain customer-facing while delivery workflow becomes explicit.

### Current database tables and relationships

Existing tables to reuse:

| Table | Relevant fields | Current use |
|---|---|---|
| `profiles` | `id`, `name`, `email`, `phone`, `role` | User identity; current enum supports `CUSTOMER`, `VENDOR`, `ADMIN`. Delivery is not included. |
| `delivery_partners` | `id`, `auth_user_id`, `name`, `email`, `phone`, `avatar`, `vehicle_type`, `is_active`, timestamps | Delivery partner profile and auth linkage. |
| `orders` | `id`, `user_id`, `store_id`, `items`, `shipping_address`, `status`, `status_history`, `delivery_partner_id`, `delivery_otp`, `live_location` | Order record, assignment record, OTP, current live location, and mixed status lifecycle. |
| `notifications` | `user_id`, `audience`, `type`, `title`, `message`, `entity_type`, `entity_id`, `read_at` | In-app notifications, including delivery assignment notifications. |

Potential new tables:

| Table | Need | Timing |
|---|---|---|
| `delivery_requests` | Supports vendor/admin request, driver accept/reject, timeout, reassignment. | Phase 2/3 |
| `deliveries` | Separates delivery lifecycle from `orders.status`; stores assigned driver, delivery status, pickup/dropoff events, proof/failure fields. | Phase 2/3 or before automatic dispatch |
| `driver_presence` or added partner fields | Tracks online/offline, last seen, current coordinates. | Phase 2 |
| `delivery_events` | Audit trail for status changes and assignment/reassignment. | Phase 5 or earlier if compliance needed |
| `delivery_earnings` | Driver earnings/payout history. | Phase 6 |
| `delivery_ratings` | Customer/merchant feedback about driver. | Phase 6 |

### Current Supabase/RLS policies related to drivers and deliveries

Existing RLS/function behavior from the analysis:

- `orders select relevant`: allows order access for the customer, admin, store owner, or assigned delivery partner.
- `orders update relevant`: allows updates by admin, store owner, or assigned delivery partner.
- `delivery partners admin or self or linked`: allows admin, the partner themself, or linked customer/vendor to read partner data.
- `delivery partners admin manage`: admin-only partner management.
- `is_assigned_partner(p_partner_id)`: helper for assigned driver checks.
- `can_view_partner(p_partner_id)`: helper for customer/vendor visibility of a linked delivery partner.
- `complete_delivery(order_uuid, otp_input)`: validates assigned partner and OTP server-side.

Needs verification:

- Whether deployed Supabase policies exactly match `supabase/schema.sql`.
- Whether `delivery_otp` is exposed to customers/vendors/drivers/admin UI through broad `select("*")` calls.
- Whether column-level or RPC-only restrictions are enforceable without breaking existing vendor/admin flows.

### Current hooks, services, and API/data-fetching logic

Current driver-related data functions:

| File/function | Purpose | Status |
|---|---|---|
| `client/src/lib/db/deliveryPartners.ts#getMyPartner()` | Finds current delivery partner by `auth_user_id`. | Exists |
| `getMyDeliveries(partnerId, status)` | Fetches orders assigned to a partner, filtered by active/completed group. | Exists |
| `updateDeliveryLocation(orderId, lat, lng)` | Writes `{ lat, lng, updatedAt }` to `orders.live_location`. | Exists |
| `completeDelivery(orderId, otp)` | Calls `complete_delivery` RPC. | Exists |
| `getAllPartners()` | Admin fetch for partner list. | Exists |
| `updatePartner()` | Admin updates partner fields including `isActive`. | Exists |
| `createPartner()` | Calls `admin-create-delivery-partner` Edge Function. | Exists |
| `client/src/lib/db/orders.ts#updateOrderStatus()` | Generic status update used by admin/vendor/driver flows. | Exists but too broad |
| `assignDeliveryPartner()` | Admin assignment, sets `delivery_partner_id`, OTP, and maybe status `Assigned`. | Exists |
| `client/src/lib/db/vendorOrders.ts` | Vendor preparation workflow. | Exists |
| `client/src/lib/db/notifications.ts` | Notification RPC helpers and notification fetching. | Exists |

No dedicated driver hook found:

- No `useDriverDeliveries`.
- No `useDeliveryRequests`.
- No `useDriverAvailability`.
- No `useLiveDeliveryTracking`.

### Current real-time or notification logic

Existing:

- `notifications` table exists.
- `notify_order_placed()` exists.
- `notify_order_status_changed()` exists.
- `notify_delivery_assigned()` exists and creates a `DELIVERY` audience notification.
- `notifications` is added to Supabase realtime publication in the schema.

Missing/incomplete:

- Driver dashboard realtime subscription.
- Vendor realtime delivery updates.
- Customer realtime subscription; customer tracking currently polls location every 10 seconds.
- Push notifications.
- SMS/email delivery notifications.
- Request timeout/expiration notifications.
- Assignment accepted/rejected notifications.

### Current UI/UX problems

- Dashboard hierarchy is too flat for live delivery operations.
- `Share Location` is not clearly separated from driver availability.
- No active delivery detail page.
- No incoming request surface.
- No single next-action button.
- No driver daily summary/earnings/history.
- No driver verification/profile flow.
- Cancellation/failure is not safely separated from normal progress actions.
- Manual refresh/polling is not reliable enough for dispatch.

### Technical risks and implementation blockers

| Risk/blocker | Why it matters | Required response |
|---|---|---|
| Broad `orders update relevant` | Drivers/vendors could bypass intended frontend flow. | Dedicated RPCs and transition validation. |
| Mixed `orders.status` | Hard to scale dispatch, tracking, delivery, cancellation. | Introduce delivery/request state model. |
| `Assigned` not in active filter | Driver may not see some assignments. | Fix query/status behavior in Phase 1. |
| No availability model | Dispatch cannot know who is online. | Add availability status and last-seen fields/table. |
| No request table | No accept/reject/timeout/reassignment. | Add `delivery_requests` or `deliveries`. |
| No realtime UI subscription | Driver may miss assignments. | Add Supabase channel subscriptions. |
| Location privacy/staleness | Customer could see stale location; driver privacy risk. | Add timestamps, cleanup, active-only rules. |
| OTP exposure needs verification | Delivery completion security could be weakened. | Audit selects and policies before adding features. |

---

## 3. Phase 1 — Stabilize the Existing Driver System

Goal: make the current admin-assigned flow safe, understandable, and testable before adding request dispatch.

### 1.1 Confirm source-of-truth files and route behavior

**Purpose**  
Verify that the actual app route tree matches the analysis and that no hidden driver pages exist.

**Files/components likely affected**

- `client/src/App.tsx`
- `client/src/pages/delivery/DeliveryLogin.tsx`
- `client/src/pages/delivery/DeliveryLayout.tsx`
- `client/src/pages/delivery/DeliveryDashboard.tsx`

**Technical notes**

- Keep `/delivery/login` and `/delivery` stable.
- Add TODO notes only if documenting, not implementation.
- Confirm whether `/delivery` should be wrapped with a delivery-specific guard later.

**Acceptance criteria**

- `/delivery/login` works for a delivery partner account.
- `/delivery` redirects non-partner accounts to `/delivery/login`.
- Customer/vendor/admin accounts cannot see driver dashboard unless they have a linked `delivery_partners` row.
- Route behavior is documented in QA notes.

### 1.2 Create a driver route guard design

**Purpose**  
Make route protection consistent and reusable without relying only on local layout checks.

**Files/components likely affected**

- New future component: `client/src/components/DeliveryProtectedRoute.tsx`
- `client/src/App.tsx`
- `client/src/lib/db/deliveryPartners.ts`

**Technical notes**

- Do not depend on `profiles.role = DELIVERY` yet because `DELIVERY` is not in the current enum.
- Guard should call `getMyPartner()` and optionally check `delivery_partners.is_active`.
- Block inactive/deactivated partners with a clear state instead of silent redirect.

**Acceptance criteria**

- Logged-out users are sent to `/delivery/login`.
- Logged-in non-partners are denied.
- Inactive delivery partners see a clear inactive/account-support message.
- No infinite redirects.

### 1.3 Fix `Assigned` visibility in the active driver query

**Purpose**  
Prevent admin-assigned orders from being hidden when `assignDeliveryPartner()` sets status to `Assigned`.

**Files/components likely affected**

- `client/src/lib/db/deliveryPartners.ts#getMyDeliveries()`
- `client/src/pages/delivery/DeliveryDashboard.tsx`
- `client/src/components/Delivery/DeliveryOrderCard.tsx`

**Technical notes**

- Short-term fix: include `Assigned` in the active delivery filter.
- Alternative: prevent assignment before `Ready for Pickup`; this is safer operationally but needs admin UX messaging.
- Recommended Phase 1 approach: include `Assigned`, then later clean status model in Phase 2.

**Acceptance criteria**

- If admin assigns a partner and status becomes `Assigned`, the driver sees the order in Active deliveries.
- `Assigned` orders display a clear “Waiting for store to mark ready” or “Assigned, awaiting pickup readiness” state.
- Driver cannot mark pickup until order is `Ready for Pickup` unless the server explicitly allows it.

### 1.4 Harden driver status actions behind service boundaries

**Purpose**  
Reduce direct usage of generic `updateOrderStatus()` from driver UI before introducing full RPC migration.

**Files/components likely affected**

- `client/src/pages/delivery/DeliveryDashboard.tsx`
- `client/src/components/Delivery/DeliveryOrderCard.tsx`
- `client/src/lib/db/deliveryPartners.ts`
- `client/src/lib/db/orders.ts`
- `supabase/schema.sql` later for RPCs

**Technical notes**

- Phase 1 can introduce wrapper functions in `deliveryPartners.ts` such as:
  - `markDeliveryPickedUp(orderId)`
  - `markDeliveryOutForDelivery(orderId)`
  - `cancelDelivery(orderId, reason)`
- Phase 1 wrappers can call existing `updateOrderStatus()` temporarily.
- Phase 2 should move these wrappers to RPC-backed implementation.

**Acceptance criteria**

- Driver UI no longer calls generic order update directly from components.
- All driver status actions flow through driver-specific service functions.
- Status action labels and error messages are driver-specific.

### 1.5 Improve driver dashboard information hierarchy

**Purpose**  
Make the dashboard usable for a real driver by prioritizing the current job and next action.

**Files/components likely affected**

- `client/src/pages/delivery/DeliveryDashboard.tsx`
- `client/src/components/Delivery/DeliveryOrderCard.tsx`
- Possibly new `client/src/components/Delivery/DriverStatusHeader.tsx`
- Possibly new `client/src/components/Delivery/CurrentDeliveryCard.tsx`

**Technical notes**

- Keep active/completed tabs for now.
- Add a header area that distinguishes:
  - Account active/inactive.
  - Location sharing state.
  - Assigned active delivery count.
- Show the most urgent active delivery first.
- Add one primary next action per card state.

**Acceptance criteria**

- Driver can immediately identify whether they have no work, assigned work, active pickup, active drop-off, or completed deliveries.
- The current active delivery appears above older/less urgent assigned deliveries.
- Empty state explains whether the driver is waiting for admin assignment or future delivery requests.

### 1.6 Improve loading, empty, and error states

**Purpose**  
Prevent silent failures and make operational states clear.

**Files/components likely affected**

- `client/src/pages/delivery/DeliveryDashboard.tsx`
- `client/src/pages/delivery/DeliveryLayout.tsx`
- `client/src/components/Delivery/DeliveryOrderCard.tsx`
- Shared components: `Loading`, `StatusState` if used

**Technical notes**

- Add explicit error state when deliveries fail to load.
- Add retry button.
- Add inactive-account state if partner exists but `is_active = false`.
- Add location permission denied/unsupported state.

**Acceptance criteria**

- Loading state appears while fetching driver/assignments.
- Empty active state is clear and not misleading.
- Error state shows retry.
- Location errors do not break the dashboard.

### 1.7 Separate dangerous actions from routine actions

**Purpose**  
Reduce accidental cancellation/failure taps during real delivery.

**Files/components likely affected**

- `client/src/components/Delivery/DeliveryOrderCard.tsx`
- `client/src/components/Delivery/CancelModal.tsx`

**Technical notes**

- Move `Cancel` into secondary “Issue with delivery” area.
- Require reason.
- Later Phase 2 should split cancellation from failed delivery.

**Acceptance criteria**

- Primary action area contains only safe next-step actions.
- Cancel/failure action is visually separated.
- Cancel modal requires a non-empty reason before submit.

### 1.8 Verify OTP security and data exposure

**Purpose**  
Ensure delivery completion OTP is not exposed to unauthorized users through broad selects.

**Files/components likely affected**

- `client/src/lib/db/orders.ts`
- `client/src/lib/db/deliveryPartners.ts`
- `client/src/types/index.ts`
- `supabase/schema.sql`
- Customer tracking components

**Technical notes**

- Audit every `select("*")` or broad `ORDER_FULL` select that returns orders.
- Confirm whether customer needs to see OTP and where it is displayed.
- Confirm whether driver should never read `delivery_otp` directly.
- Needs verification against deployed Supabase project.

**Acceptance criteria**

- OTP is visible only to intended customer context or secure completion flow.
- Driver cannot read OTP from normal delivery fetch.
- Admin visibility rules are intentional and documented.
- Any exposure risk is documented before Phase 2 implementation.

### 1.9 Phase 1 QA checks

**Acceptance checklist**

- [ ] Delivery partner can log in.
- [ ] Non-partner cannot access driver dashboard.
- [ ] Inactive partner state is clear.
- [ ] Assigned orders are visible, including `Assigned` status if used.
- [ ] Driver cannot complete delivery without OTP.
- [ ] Wrong OTP fails.
- [ ] Driver cannot update unassigned orders.
- [ ] Empty active/completed states are clear.
- [ ] Location permission denied does not crash UI.
- [ ] Cancel/failure action is separated from normal progress actions.
- [ ] Mobile layout works on narrow screens.

---

## 4. Phase 2 — Build Core Driver Delivery Flow

Goal: build the minimum complete driver workflow: availability, requests, accept/reject, active delivery, completion, failure, and history.

### 2.1 Driver online/offline availability toggle

**User story**  
As a delivery partner, I want to go online when I am available and offline when I stop working so the marketplace does not send me deliveries when I am unavailable.

**Required UI**

- Add `DriverStatusHeader` to `/delivery`.
- Toggle states:
  - Offline
  - Online
  - Busy / On delivery
  - Inactive / disabled by admin
- Show last seen / last location update.

**Required data fields**

Recommended minimal approach:

- Add columns to `delivery_partners`:
  - `availability_status text default 'offline'`
  - `last_seen_at timestamptz`
  - `last_location jsonb` or `current_lat`, `current_lng`

Alternative stronger approach:

- New `driver_presence` table:
  - `partner_id`
  - `availability_status`
  - `last_seen_at`
  - `last_location`
  - `updated_at`

**Backend/database implications**

- Add RLS so partner can update only their own availability.
- Admin can read all availability states.
- Vendor should only see limited availability data if dispatch supports vendor assignment.

**Acceptance criteria**

- Driver can go online/offline.
- Admin can see current driver availability.
- Offline drivers do not appear in available-driver dispatch lists.
- Driver cannot go online if admin-deactivated.

### 2.2 Available delivery requests screen

**User story**  
As a driver, I want to see new delivery requests with pickup/drop-off information so I can decide whether to accept.

**Required UI**

- Add section on `/delivery`: Incoming Requests.
- Future route optional: `/delivery/requests`.
- Request card fields:
  - Order short ID.
  - Store name and area.
  - Drop-off area.
  - Estimated distance/time if available.
  - Delivery fee if available.
  - Request age/time remaining.
  - Accept and Reject buttons.

**Required data fields**

Recommended new table: `delivery_requests`

Suggested fields:

- `id uuid primary key`
- `order_id uuid references orders(id)`
- `delivery_partner_id uuid references delivery_partners(id)` nullable for broadcast requests
- `requested_by uuid references profiles(id)` nullable or admin/vendor id
- `requested_by_role text`
- `status text check in ('pending','accepted','rejected','expired','cancelled')`
- `reject_reason text`
- `expires_at timestamptz`
- `responded_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

**Backend/database implications**

- Add unique constraint to prevent multiple active accepted requests for same order.
- Add RPC for accepting request to prevent race conditions.
- Add RLS so drivers only see their own targeted requests or broadcast requests if online/eligible.

**Acceptance criteria**

- Online driver sees pending requests.
- Offline driver does not receive requests.
- Expired requests disappear or show expired state.
- Driver can accept/reject only pending requests.

### 2.3 Accept/reject delivery request

**User story**  
As a driver, I want to accept or reject a delivery request so the system knows whether to assign me.

**Required UI**

- Accept button.
- Reject button.
- Reject reason modal optional for MVP; required for operational QA.
- Success/failure toast.

**Required data fields**

- `delivery_requests.status`
- `delivery_requests.responded_at`
- `delivery_requests.reject_reason`
- `orders.delivery_partner_id`
- `orders.status` or `deliveries.status`

**Backend/database implications**

Add RPCs:

- `accept_delivery_request(request_uuid uuid)`
- `reject_delivery_request(request_uuid uuid, reason text)`

Acceptance RPC must:

- Verify requester is the target driver.
- Verify request is still pending and not expired.
- Lock order/request row to prevent two drivers accepting same delivery.
- Assign `orders.delivery_partner_id` or create/update `deliveries` row.
- Set status to `Assigned` / `Driver Accepted` depending on chosen model.
- Notify vendor/customer/admin.

**Acceptance criteria**

- Only one driver can accept a request.
- Two simultaneous accepts cannot assign two drivers.
- Rejected requests do not assign the driver.
- Vendor/admin can see accepted/rejected state.

### 2.4 Active delivery screen

**User story**  
As a driver, I want a focused active delivery screen with one clear next step so I can safely complete pickup and drop-off.

**Required UI**

Create route:

- `/delivery/orders/:orderId`

Screen sections:

- Delivery status timeline.
- Pickup card: store name, phone, address, map action.
- Drop-off card: customer name, phone, address, instructions, map action.
- Item summary.
- One primary next action.
- Location sharing state.
- Support/issue section separated below.

**Required data fields**

Reuse existing order fields initially:

- `orders.status`
- `orders.store_id`
- `orders.shipping_address`
- `orders.items`
- `orders.delivery_partner_id`
- `orders.live_location`

Future fields if using `deliveries`:

- `deliveries.status`
- `accepted_at`
- `arrived_at_store_at`
- `picked_up_at`
- `out_for_delivery_at`
- `arrived_at_customer_at`
- `delivered_at`
- `failed_at`

**Backend/database implications**

- Add `getDeliveryDetail(partnerId, orderId)` or use existing function carefully.
- Add RPC-backed status transitions in Phase 2.

**Acceptance criteria**

- Driver can open assigned active delivery detail.
- Screen shows only delivery actions allowed for current status.
- Wrong-status actions are disabled/hidden.
- Driver can call store/customer if phone exists.
- Missing address/phone has safe fallback messaging.

### 2.5 Pickup confirmation

**User story**  
As a driver, I want to confirm pickup after receiving the order from the store so the customer and vendor know the order left the store.

**Required UI**

- Primary action: `Confirm Pickup` or `Mark Picked Up`.
- Confirmation modal if needed.

**Required data fields**

- `orders.status = 'Picked Up'` or `deliveries.status = 'picked_up'`.
- Timestamp field recommended: `picked_up_at`.

**Backend/database implications**

Add RPC:

- `driver_mark_picked_up(order_uuid uuid)`

RPC should validate:

- Caller is assigned partner.
- Order is in `Ready for Pickup`, `Assigned`, or accepted delivery state depending model.
- Order is not cancelled/delivered.
- Status history/event is appended.

**Acceptance criteria**

- Only assigned driver can mark pickup.
- Driver cannot mark pickup before assignment/acceptance.
- Vendor/customer status updates after pickup.
- Invalid transition is blocked server-side.

### 2.6 Delivery start action

**User story**  
As a driver, I want to mark that I am on the way so customer and vendor can track the delivery stage.

**Required UI**

- Primary action after pickup: `Start Delivery` / `Out for Delivery`.
- Optional map/navigation button.

**Required data fields**

- `orders.status = 'Out for Delivery'` or `deliveries.status = 'out_for_delivery'`.
- Timestamp: `out_for_delivery_at`.

**Backend/database implications**

Add RPC:

- `driver_mark_out_for_delivery(order_uuid uuid)`

**Acceptance criteria**

- Only picked-up assigned deliveries can become out for delivery.
- Customer sees “On the way” state.
- Location sharing can start automatically or prompt clearly.

### 2.7 Delivery completion action

**User story**  
As a driver, I want to complete delivery securely using the customer OTP so delivery cannot be falsely completed.

**Required UI**

- Keep `OtpModal`.
- Move it into active delivery screen as final primary action.
- Add optional proof-of-delivery placeholder for later.

**Required data fields**

Existing:

- `orders.delivery_otp`
- `orders.status`
- `orders.status_history`

Future:

- `deliveries.delivered_at`
- `deliveries.proof_photo_url`
- `deliveries.completion_method`

**Backend/database implications**

- Keep `complete_delivery(order_uuid, otp_input)` or replace with `driver_complete_delivery` wrapper.
- Add cleanup for live location after delivery.
- Add delivery event/earning record later.

**Acceptance criteria**

- Wrong OTP fails.
- Correct OTP completes delivery.
- Completion clears OTP.
- Customer/vendor/admin see delivered state.
- Driver no longer shares location after delivery.

### 2.8 Failed/cancelled delivery handling

**User story**  
As a driver, I need to report delivery problems without accidentally cancelling valid orders.

**Required UI**

- “Report issue” section, not beside primary actions.
- Issue types:
  - Customer unavailable
  - Wrong/invalid address
  - Store cannot release order
  - Vehicle/driver issue
  - App/location issue
  - Other
- Separate paths:
  - `Report failed delivery`
  - `Request support`
  - `Cancel delivery` only if allowed

**Required data fields**

- `failed_reason`
- `failed_at`
- `cancelled_reason`
- `cancelled_by_role`
- `support_note`

**Backend/database implications**

Add RPCs:

- `driver_report_failed_delivery(order_uuid, reason, note)`
- `driver_cancel_delivery(order_uuid, reason)` if cancellation remains driver-allowed

**Acceptance criteria**

- Failure reason is required.
- Vendor/admin can see failure reason.
- Failed delivery is separate from normal cancellation if model supports it.
- Failed/cancelled delivery can be reassigned or closed by admin according to business rule.

### 2.9 Delivery history

**User story**  
As a driver, I want to review completed and failed deliveries so I can track my work.

**Required UI**

- `/delivery/history` or dashboard tab expansion.
- Filters:
  - Today
  - This week
  - Custom date range later
  - Delivered / cancelled / failed

**Required data fields**

- Reuse `orders.created_at`, status, partner id initially.
- Better: use `deliveries` with timestamps and outcome.

**Backend/database implications**

- Index by `delivery_partner_id`, status, date.
- Avoid loading all historical orders without pagination.

**Acceptance criteria**

- Driver sees completed deliveries.
- Cancelled/failed deliveries are clearly separated from successful deliveries.
- History loads with pagination or sensible limit.

---

## 5. Phase 3 — Improve Vendor Dispatch Flow

Goal: let vendors request and monitor delivery clearly after an order is ready.

### 3.1 Vendor request driver action

**Vendor user need**  
When an order is ready for pickup, the vendor needs a clear action to request delivery.

**UI changes**

- Add `Request Driver` action to:
  - `client/src/pages/vendor/VendorOrders.tsx`
  - `client/src/pages/vendor/VendorOrderPrepare.tsx`
  - `VendorOrderDetailModal` if used
- Show only when order is `Ready for Pickup` and no active delivery request/assigned driver exists.

**Data/status changes**

- Create `delivery_requests` row.
- Set order status or delivery status to `Driver Requested` if using status field.
- Append status history/event.

**Permission rules**

- Vendor can request delivery only for their own store’s orders.
- Vendor cannot request driver for unprepared/non-ready orders.
- Vendor cannot create duplicate active requests.

**Acceptance criteria**

- Vendor can request driver for ready order.
- Vendor cannot request driver for another store’s order.
- Vendor cannot request multiple active drivers for same order unless reassignment workflow allows it.

### 3.2 Vendor view of available drivers

**Vendor user need**  
Vendor needs to know whether a driver is available or if the order is waiting for dispatch.

**UI changes**

- Add optional driver availability panel.
- For MVP, show status summary:
  - “Waiting for driver”
  - “Driver assigned”
  - “Driver accepted”
  - “Driver picked up”
  - “Out for delivery”
- Do not expose unnecessary driver location before assignment.

**Data/status changes**

- Requires driver availability fields/table.
- Requires delivery request/assignment status.

**Permission rules**

- Vendor can see availability summary, not full private driver data unless assigned to their order.
- Vendor can see assigned partner contact only after assignment/acceptance.

**Acceptance criteria**

- Vendor sees clear dispatch state.
- Vendor does not see offline/unverified/deactivated drivers as available.
- Vendor sees assigned driver once assigned.

### 3.3 Manual driver assignment, if supported

**Vendor user need**  
Some stores may manually assign trusted drivers. This should be optional and controlled.

**UI changes**

- Add optional `Assign Driver` selector for vendors only if business rules allow it.
- Otherwise keep manual assignment admin-only and give vendors only `Request Driver`.

**Data/status changes**

- If vendor assignment is supported, use same RPC as admin assignment with stricter permission check.

**Permission rules**

- Needs verification: whether vendors should be allowed to choose drivers.
- Safer MVP: vendor requests driver; admin/system assigns.

**Acceptance criteria**

- Assignment permission is explicit.
- Vendor cannot assign deactivated/offline/unverified drivers.
- Assignment writes audit event.

### 3.4 Delivery progress visibility

**Vendor user need**  
Vendor needs to know whether the order was picked up and delivered.

**UI changes**

- Add delivery timeline to vendor order detail:
  - Ready for Pickup
  - Driver Requested
  - Driver Assigned/Accepted
  - Picked Up
  - Out for Delivery
  - Delivered/Failed/Cancelled

**Data/status changes**

- Reuse `status_history` for MVP.
- Better: read from `delivery_events` or `deliveries` timestamps.

**Permission rules**

- Vendor can view delivery progress only for their store’s order.

**Acceptance criteria**

- Vendor sees pickup/delivery progress without refreshing after Phase 4 realtime.
- Vendor can identify stalled delivery states.

### 3.5 Reassign/cancel delivery handling

**Vendor user need**  
If a driver rejects, expires, cancels, or fails delivery, vendor needs a clear next step.

**UI changes**

- Show `Request another driver` if request rejected/expired/failed.
- Show `Contact support` or `Cancel order` depending policy.

**Data/status changes**

- `delivery_requests.status` supports `rejected`, `expired`, `cancelled`.
- `deliveries.status` supports `failed`, `cancelled`, `reassigned` or audit event.

**Permission rules**

- Vendor can request reassignment for own store order.
- Admin retains override/reassign authority.

**Acceptance criteria**

- Rejected/expired request can be re-requested.
- Failed delivery is visible to vendor/admin.
- Reassignment is audited.

---

## 6. Phase 4 — Real-Time Status, Notifications, and Tracking

Goal: make delivery coordination timely without manual refresh.

### 4.1 Real-time delivery request updates

**Real-time event trigger**

- Insert/update on `delivery_requests`.

**Who receives the update**

- Target driver.
- Vendor/store owner.
- Admin monitoring screen.

**UI behavior**

- Driver sees new request immediately.
- Vendor sees “Waiting / Accepted / Rejected / Expired”.
- Admin sees live request status.

**Technical implementation notes**

- Use `supabase.channel()` subscriptions.
- Subscribe only to rows the user can access through RLS.
- Use notifications as fallback if request subscription fails.

**Acceptance criteria**

- New request appears on driver dashboard without refresh.
- Vendor sees accepted/rejected without refresh.
- Unauthorized users do not receive request data.

### 4.2 Real-time order/delivery status changes

**Real-time event trigger**

- Update on `orders.status` or `deliveries.status`.
- Insert into `delivery_events` if used.

**Who receives the update**

- Driver assigned to delivery.
- Vendor/store owner.
- Customer who owns order.
- Admin.

**UI behavior**

- Driver dashboard updates active/completed lists.
- Vendor timeline updates.
- Customer tracking updates status and map state.
- Admin monitoring updates status.

**Technical implementation notes**

- Existing customer polling can remain as fallback.
- Add realtime subscriptions in:
  - Delivery dashboard.
  - Vendor orders/detail.
  - Customer order tracking.
  - Admin orders/monitoring.

**Acceptance criteria**

- Status changes appear within a few seconds.
- Polling fallback still works if realtime disconnects.
- No cross-user data leakage.

### 4.3 Driver notifications

**Real-time event trigger**

- `notify_delivery_assigned()`
- New request created.
- Request timeout warning.
- Vendor/admin cancelled order.
- Reassignment.

**Who receives the update**

- Driver.

**UI behavior**

- Toast/in-app alert for new request.
- Notification center shows unread requests and updates.
- Critical request alert is visually distinct.

**Technical implementation notes**

- Extend `client/src/lib/db/notifications.ts` if needed.
- Add `DeliveryNotificationCenter` or shared notification hook.
- Later add push notification token support.

**Acceptance criteria**

- Driver sees new assignment/request without manual refresh.
- Notification opens the relevant delivery/request.
- Read/unread works correctly.

### 4.4 Vendor notifications

**Real-time event trigger**

- Driver accepted.
- Driver rejected.
- Driver picked up.
- Driver failed/cancelled.
- Delivered.

**Who receives the update**

- Store owner/vendor.

**UI behavior**

- Vendor receives toast or notification center item.
- Vendor order row/timeline updates.

**Acceptance criteria**

- Vendor knows when order leaves store.
- Vendor knows when delivery fails or needs action.

### 4.5 Customer delivery progress updates

**Real-time event trigger**

- Delivery status update.
- Driver location update.
- Delivered/cancelled/failed state.

**Who receives the update**

- Customer/order owner.

**UI behavior**

- `OrderTracking` updates timeline and map.
- OTP remains visible only as intended.
- Stale map warning appears if driver location is old.

**Technical implementation notes**

- Keep `getOrderLocation()` polling as fallback.
- Prefer realtime for status; location may still use polling to avoid high-frequency realtime complexity.

**Acceptance criteria**

- Customer sees status changes promptly.
- Customer map handles no-location/stale-location gracefully.

### 4.6 Optional map/location tracking with stale handling

**Real-time event trigger**

- Driver location update during active delivery.

**Who receives the update**

- Customer.
- Admin monitoring.
- Vendor only if business policy allows.

**UI behavior**

- Driver sees location sharing state and last update time.
- Customer map shows current/stale indicator.
- Location disappears or becomes inactive after terminal status.

**Technical implementation notes**

- Add `live_location_updated_at` if keeping location on `orders`.
- Better: move to `deliveries.live_location` or `driver_locations`.
- Use active-delivery-only writes.
- Clear or expire on `Delivered`, `Cancelled`, `Failed`.

**Acceptance criteria**

- Location is only written during active delivery.
- Stale location is clearly labeled.
- Location stops after terminal state.

---

## 7. Phase 5 — Admin Driver Management

Goal: give admins operational control and visibility over delivery partners and deliveries.

### 5.1 Driver approval/verification

**Admin use case**  
Admin needs to approve drivers before they can accept deliveries.

**UI requirements**

- Update `client/src/pages/admin/AdminDeliveryPartners.tsx`.
- Add statuses:
  - Pending review
  - Approved
  - Suspended
  - Rejected
- Show document/verification fields if driver onboarding is added.

**Database requirements**

Add columns or related table:

- `delivery_partners.approval_status`
- `verified_at`
- `verified_by`
- `suspended_at`
- `suspension_reason`

Optional:

- `delivery_partner_documents` table for license/ID/insurance.

**Security/RLS requirements**

- Admin can update approval/verification status.
- Driver can read own approval status.
- Driver cannot self-approve.

**Acceptance criteria**

- Unapproved drivers cannot go online.
- Suspended drivers cannot access active delivery work.
- Admin can approve/suspend with reason.

### 5.2 Driver status monitoring

**Admin use case**  
Admin needs to see who is online, offline, busy, inactive, or suspended.

**UI requirements**

- Add status chips in `AdminDeliveryPartners`.
- Add filters by availability/approval/status.
- Add last seen and active delivery count.

**Database requirements**

- Availability fields/table from Phase 2.
- Active delivery count can be query-derived.

**Security/RLS requirements**

- Admin can read all partner statuses.
- Vendor/customer cannot see full operational status except linked delivery info.

**Acceptance criteria**

- Admin can identify available drivers.
- Admin can identify stalled/offline drivers with active delivery.

### 5.3 Driver delivery history

**Admin use case**  
Admin needs to audit a driver’s past deliveries.

**UI requirements**

- Admin partner detail page, likely new route:
  - `/admin/delivery-partners/:partnerId`
- Show completed, failed, cancelled, reassigned deliveries.

**Database requirements**

- Use orders for MVP.
- Prefer `deliveries`/`delivery_events` once created.

**Security/RLS requirements**

- Admin-only full history.
- Driver sees only own history.

**Acceptance criteria**

- Admin can open a driver and see historical delivery outcomes.
- History is filterable and paginated.

### 5.4 Driver performance metrics

**Admin use case**  
Admin needs to evaluate reliability and quality.

**UI requirements**

Metrics:

- Completed deliveries.
- Failed deliveries.
- Cancellation rate.
- Average pickup time.
- Average delivery duration.
- Acceptance rate.
- Rejection rate.
- Rating average later.

**Database requirements**

- Requires timestamps from `deliveries` or `delivery_events`.
- Requires request records for acceptance/rejection rates.

**Security/RLS requirements**

- Admin sees all metrics.
- Driver sees own metrics in Phase 6.

**Acceptance criteria**

- Admin can compare drivers reliably.
- Metrics exclude cancelled-by-vendor/customer cases appropriately.

### 5.5 Manual order reassignment

**Admin use case**  
Admin needs to reassign orders when a driver rejects, goes offline, or fails delivery.

**UI requirements**

- Update `client/src/pages/admin/AdminOrders.tsx`.
- Add reassignment action to order detail.
- Show current assigned driver and status.
- Show eligible available drivers.

**Database requirements**

- Delivery request/delivery audit fields.
- Reassignment reason.
- Previous partner id.

**Security/RLS requirements**

- Admin-only direct reassignment.
- Reassignment writes audit event.

**Acceptance criteria**

- Admin can reassign active delivery.
- Old driver no longer sees reassigned delivery.
- New driver receives request/assignment.
- Customer/vendor timeline updates.

### 5.6 Admin audit trail for delivery status changes

**Admin use case**  
Admin needs to know who changed each delivery status and when.

**UI requirements**

- Add delivery event timeline in admin order detail.

**Database requirements**

Recommended table: `delivery_events`

Fields:

- `id`
- `order_id`
- `delivery_id` nullable
- `actor_user_id`
- `actor_role`
- `event_type`
- `from_status`
- `to_status`
- `note`
- `metadata jsonb`
- `created_at`

**Security/RLS requirements**

- Admin read all.
- Vendor read events for own store orders.
- Driver read own delivery events.
- Customer read customer-safe delivery events.

**Acceptance criteria**

- Every assignment/status/failure/reassignment creates an event.
- Admin can audit full delivery chain.

---

## 8. Phase 6 — Driver Earnings, Ratings, and Performance

Goal: complete the driver partner experience with accountability and payout transparency.

### 6.1 Completed delivery history

**Driver value**  
Drivers can track work completed and resolve disputes.

**Required data model**

- `deliveries` or `orders` with delivery timestamps.
- Outcome states: delivered, failed, cancelled, reassigned.

**UI requirements**

- `/delivery/history`
- Date filters.
- Outcome filters.
- Delivery detail link.

**Acceptance criteria**

- Driver can see completed deliveries by date.
- Failed/cancelled deliveries are separate.

### 6.2 Earnings summary

**Driver value**  
Drivers need transparency into delivery compensation.

**Required data model**

Recommended table: `delivery_earnings`

Fields:

- `id`
- `delivery_id` or `order_id`
- `delivery_partner_id`
- `base_fee`
- `tip_amount`
- `bonus_amount`
- `adjustment_amount`
- `total_amount`
- `status` (`pending`, `approved`, `paid`, `voided`)
- `created_at`
- `paid_at`

**UI requirements**

- `/delivery/earnings`
- Today/week/month summary.
- Per-delivery breakdown.
- Pending vs paid.

**Acceptance criteria**

- Delivered order creates/derives earning record.
- Cancelled/failed deliveries are not incorrectly counted as paid.
- Driver can filter earnings by date.

### 6.3 Delivery fee/tip breakdown

**Driver value**  
Drivers understand how total earnings are calculated.

**Required data model**

- Add tip support only if marketplace supports tipping.
- Needs verification: current checkout/payment model does not document tips.

**UI requirements**

- Earnings row breakdown:
  - Base delivery fee
  - Tip
  - Bonus/adjustment
  - Total

**Acceptance criteria**

- Fees/tips are displayed accurately.
- Missing tip support is shown as not applicable, not zero if unknown.

### 6.4 Ratings and feedback

**Driver value**  
Drivers and admins can improve quality and accountability.

**Required data model**

Recommended table: `delivery_ratings`

Fields:

- `id`
- `order_id`
- `delivery_partner_id`
- `customer_id`
- `rating integer check 1-5`
- `feedback text`
- `created_at`

**UI requirements**

- Customer post-delivery rating prompt.
- Driver rating summary.
- Admin driver detail rating view.

**Acceptance criteria**

- Customer can rate after delivery only.
- Driver cannot rate themselves.
- Admin can review ratings.

### 6.5 Cancellation/failure tracking

**Driver value**  
Protects driver accountability while separating driver-caused and non-driver-caused issues.

**Required data model**

- `failed_reason`
- `cancelled_by_role`
- `failure_category`
- `responsibility` optional admin-reviewed field.

**UI requirements**

- Driver history shows outcome and reason.
- Admin can classify responsibility.

**Acceptance criteria**

- Driver-caused vs vendor/customer/system cancellation can be distinguished.
- Metrics do not unfairly penalize drivers for external cancellations.

### 6.6 Performance dashboard

**Driver value**  
Drivers understand progress and performance.

**Required data model**

- Delivery events/timestamps.
- Earnings.
- Ratings.
- Requests accepted/rejected.

**UI requirements**

- `/delivery/performance` or earnings dashboard section.
- Metrics:
  - Completed deliveries.
  - Acceptance rate.
  - Cancellation/failure rate.
  - Average delivery time.
  - Rating.
  - Earnings.

**Acceptance criteria**

- Driver sees meaningful metrics.
- Admin metrics match driver-facing totals where appropriate.

---

## 9. Database and Supabase Plan

### Existing tables to reuse

| Table | Reuse plan |
|---|---|
| `profiles` | Keep for core auth user identity. Do not force delivery into this enum until strategy is decided. |
| `delivery_partners` | Continue as delivery partner profile. Add availability/approval fields if not using separate tables. |
| `orders` | Continue as order source of truth and customer-facing status during MVP. |
| `notifications` | Reuse for in-app delivery alerts. Extend notification types. |

### New tables needed

Use minimal new tables, but add them where existing tables cannot cleanly represent workflow.

#### Recommended MVP new table: `delivery_requests`

Needed because accept/reject/timeout/reassignment cannot be cleanly represented only by `orders.delivery_partner_id`.

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `order_id uuid not null references orders(id)`
- `delivery_partner_id uuid references delivery_partners(id)`
- `requested_by uuid references profiles(id)`
- `requested_by_role text not null`
- `status text not null default 'pending'`
- `reject_reason text`
- `expires_at timestamptz`
- `responded_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

#### Recommended stronger table: `deliveries`

Needed when delivery lifecycle becomes complex enough to separate from order lifecycle.

Suggested fields:

- `id uuid primary key default gen_random_uuid()`
- `order_id uuid not null references orders(id)`
- `delivery_partner_id uuid references delivery_partners(id)`
- `status text not null`
- `assigned_at timestamptz`
- `accepted_at timestamptz`
- `rejected_at timestamptz`
- `arrived_at_store_at timestamptz`
- `picked_up_at timestamptz`
- `out_for_delivery_at timestamptz`
- `arrived_at_customer_at timestamptz`
- `delivered_at timestamptz`
- `failed_at timestamptz`
- `failed_reason text`
- `cancelled_at timestamptz`
- `cancelled_reason text`
- `live_location jsonb`
- `live_location_updated_at timestamptz`
- `proof_photo_url text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

#### Optional table: `delivery_events`

Useful for admin audit and debugging.

#### Optional table: `driver_presence`

Use if you do not want rapidly changing availability/location fields on `delivery_partners`.

#### Phase 6 tables

- `delivery_earnings`
- `delivery_ratings`
- `driver_payouts` if payouts are managed inside the app

### Columns to add

If keeping a simpler schema first, add to `delivery_partners`:

- `availability_status text default 'offline'`
- `last_seen_at timestamptz`
- `approval_status text default 'approved'` for existing partners, or `pending` for new onboarding
- `verified_at timestamptz`
- `suspended_at timestamptz`
- `suspension_reason text`

If keeping location in `orders` temporarily:

- `live_location_updated_at timestamptz` or ensure `orders.live_location.updatedAt` is consistently written and indexed/queried appropriately.

### Status enum improvements

Short-term:

- Keep current string statuses, but centralize constants in TypeScript and SQL checks/RPC validation.

Medium-term:

- Create separate statuses:
  - `orders.status`: `Placed`, `Confirmed`, `Preparing`, `Ready for Pickup`, `Out for Delivery`, `Delivered`, `Cancelled`, etc.
  - `delivery_requests.status`: `pending`, `accepted`, `rejected`, `expired`, `cancelled`.
  - `deliveries.status`: `assigned`, `accepted`, `arriving_at_store`, `picked_up`, `out_for_delivery`, `arrived_at_customer`, `delivered`, `failed`, `cancelled`.

### RLS policy changes

Required policy direction:

- Drivers can read their own `delivery_partners` row.
- Drivers can update only safe self-owned fields such as availability, not approval status.
- Drivers can read assigned/requested deliveries.
- Drivers cannot update arbitrary order columns directly.
- Driver actions should go through RPCs.
- Vendors can request delivery only for their store orders.
- Vendors can read delivery progress for their store orders.
- Admins can manage all delivery partners, deliveries, requests, events.

Recommended hardening:

- Reduce direct `orders update relevant` scope or stop relying on it for driver updates.
- Add RPCs for all status transitions.
- Ensure OTP cannot be read by unauthorized roles.

### Realtime subscription requirements

Enable realtime for:

- `notifications` already included in schema analysis.
- `delivery_requests` when added.
- `deliveries` when added.
- Potentially `orders` for status changes if continuing to use `orders.status`.

Client subscriptions:

- Driver dashboard: delivery requests, assigned deliveries, notifications.
- Vendor order page/detail: delivery request/status updates.
- Customer order tracking: status updates, optionally location.
- Admin monitoring: requests, deliveries, driver presence.

### Indexing/performance considerations

Add indexes for:

- `delivery_requests(order_id)`
- `delivery_requests(delivery_partner_id, status)`
- `delivery_requests(status, expires_at)`
- `deliveries(order_id)`
- `deliveries(delivery_partner_id, status)`
- `deliveries(status, created_at desc)`
- `delivery_events(order_id, created_at desc)`
- `delivery_partners(availability_status, approval_status, is_active)`
- `delivery_earnings(delivery_partner_id, created_at desc)` when Phase 6 begins

### Migration order

1. Add safe status constants/RPCs first.
2. Add availability fields/table.
3. Add `delivery_requests`.
4. Add `deliveries` if selected before request workflow, otherwise after MVP request flow.
5. Add realtime publication entries.
6. Add events/audit table.
7. Add approval/verification fields.
8. Add earnings/ratings tables.

---

## 10. UI/UX Screen Plan

### Driver dashboard

**Purpose**  
Give driver a clear overview of availability, incoming work, current delivery, and today’s progress.

**Primary user actions**

- Go online/offline.
- View incoming requests.
- Open active delivery.
- Share/stop location during active delivery.
- View history/earnings links.

**Key information displayed**

- Driver name.
- Account approval/active state.
- Availability state.
- Current delivery summary.
- Incoming requests.
- Completed today count.

**Empty state**

- Offline: “Go online to receive delivery requests.”
- Online/no requests: “You’re online. New requests will appear here.”
- No assigned work: “No active deliveries assigned.”

**Loading state**

- Skeleton/status header loading.
- Delivery/request list placeholders.

**Error state**

- “Unable to load deliveries” with retry.
- Location permission warning if applicable.

### Available requests

**Purpose**  
Let drivers evaluate and respond to delivery offers.

**Primary user actions**

- Accept request.
- Reject request.
- Open request details.

**Key information displayed**

- Pickup store.
- Drop-off area.
- Distance/ETA if available.
- Delivery fee if available.
- Request expiration countdown.

**Empty state**

- “No delivery requests right now.”

**Loading state**

- Request card skeletons.

**Error state**

- “Unable to load requests” with retry.

### Active delivery

**Purpose**  
Support safe execution of pickup, navigation, drop-off, and completion.

**Primary user actions**

- Navigate to pickup.
- Mark picked up.
- Start delivery.
- Navigate to customer.
- Complete with OTP.
- Report issue.

**Key information displayed**

- Order ID and status.
- Store details.
- Customer/drop-off details.
- Instructions.
- Item summary.
- Timeline.
- Location sharing state.

**Empty state**

- Not applicable if opened by ID; show “Delivery not found or no access.”

**Loading state**

- Delivery detail skeleton.

**Error state**

- No access / delivery already reassigned / failed to load.

### Delivery detail

**Purpose**  
Provide a read-only or secondary detail view for assigned/completed deliveries.

**Primary user actions**

- Review info.
- Contact support.
- Open history event timeline.

**Key information displayed**

- Timeline.
- Store/customer details.
- Items.
- Status history.
- Outcome reason if failed/cancelled.

### Delivery history

**Purpose**  
Let drivers review past work.

**Primary user actions**

- Filter by date/status.
- Open delivery detail.

**Key information displayed**

- Delivered/failed/cancelled count.
- Date/time.
- Store/customer area.
- Outcome.

### Vendor dispatch panel

**Purpose**  
Let vendors request or monitor delivery after order preparation.

**Primary user actions**

- Request driver.
- View driver assignment.
- Request reassignment if allowed.
- Contact support.

**Key information displayed**

- Dispatch status.
- Assigned driver.
- Request age/status.
- Pickup/delivery status.

### Vendor order delivery timeline

**Purpose**  
Show what is happening after order readiness.

**Primary user actions**

- View status.
- Re-request driver when rejected/expired.
- Contact support.

**Key information displayed**

- Ready for pickup.
- Driver requested.
- Driver accepted.
- Picked up.
- Out for delivery.
- Delivered/failed/cancelled.

### Admin driver management

**Purpose**  
Manage driver accounts, approval, activity, and assignment readiness.

**Primary user actions**

- Create driver.
- Approve/verify driver.
- Activate/deactivate/suspend.
- View history/performance.

**Key information displayed**

- Driver name/contact.
- Vehicle type.
- Approval status.
- Availability.
- Active delivery count.
- Last seen.

### Admin delivery monitoring

**Purpose**  
Let admin monitor and intervene in live deliveries.

**Primary user actions**

- Assign/reassign driver.
- View delivery status.
- View live/stale location.
- Resolve failed delivery.
- Audit events.

**Key information displayed**

- Order ID.
- Store/customer.
- Driver.
- Status.
- Request state.
- Last update.
- Failure/cancel reason.

---

## 11. Technical QA Plan

### Driver login and role access

- [ ] Delivery partner can log in through `/delivery/login`.
- [ ] Logged-out user cannot access `/delivery`.
- [ ] Customer account without partner row cannot access `/delivery`.
- [ ] Vendor account without partner row cannot access `/delivery`.
- [ ] Admin account without partner row cannot access `/delivery` unless intentionally allowed.
- [ ] Inactive/suspended driver cannot receive requests.
- [ ] Password recovery behavior: Needs verification.

### Vendor dispatch flow

- [ ] Vendor can request driver only for own store orders.
- [ ] Vendor cannot request driver before order is ready.
- [ ] Vendor cannot create duplicate active requests.
- [ ] Vendor sees request pending/accepted/rejected/expired.
- [ ] Vendor sees delivery progress after assignment.
- [ ] Vendor can request reassignment only when allowed.

### Driver accept/reject flow

- [ ] Online driver receives request.
- [ ] Offline driver does not receive request.
- [ ] Driver can accept pending request.
- [ ] Driver can reject pending request with reason.
- [ ] Expired request cannot be accepted.
- [ ] Two drivers cannot accept same order at the same time.
- [ ] Rejected request is visible to vendor/admin.

### Delivery status transitions

- [ ] Driver cannot skip from requested directly to delivered.
- [ ] Driver cannot mark pickup unless assigned/accepted and order is ready.
- [ ] Driver cannot mark out for delivery before pickup.
- [ ] Driver cannot complete without correct OTP.
- [ ] Delivered/cancelled/failed states are terminal unless admin explicitly reopens.
- [ ] Status history/event log is written for each transition.

### Real-time updates

- [ ] Driver receives new request without manual refresh.
- [ ] Vendor sees accept/reject without manual refresh.
- [ ] Customer sees delivery status update without full page reload.
- [ ] Admin sees live delivery/request status.
- [ ] Realtime disconnect falls back to polling or manual refresh.

### Notification behavior

- [ ] Driver receives assignment/request notification.
- [ ] Vendor receives accepted/rejected/pickup/failure notification.
- [ ] Customer receives assignment/out-for-delivery/delivered notification.
- [ ] Notifications are scoped to correct user.
- [ ] Read/unread state works.

### Mobile responsiveness

- [ ] Driver dashboard works on iPhone-sized viewport.
- [ ] Active delivery screen uses large buttons.
- [ ] Cancel/failure actions are not next to routine actions.
- [ ] Maps links open correctly from mobile browser.
- [ ] Sticky/bottom actions do not cover content.

### RLS/security validation

- [ ] Driver cannot select another driver’s delivery requests.
- [ ] Driver cannot update another driver’s order/delivery.
- [ ] Vendor cannot dispatch for another store.
- [ ] Customer cannot read driver-only data.
- [ ] OTP is not exposed to unauthorized readers.
- [ ] Admin-only fields cannot be changed by driver/vendor.
- [ ] Direct Supabase calls cannot bypass status transition rules.

### Edge cases

- [ ] Driver goes offline during active delivery.
- [ ] Driver loses network during status update.
- [ ] Driver accepts request while another driver accepts at same time.
- [ ] Vendor cancels after driver accepted.
- [ ] Admin reassigns after driver accepted.
- [ ] Customer address is missing or invalid.
- [ ] Store coordinates are missing.
- [ ] Drop-off coordinates are missing.
- [ ] Driver location permission denied.
- [ ] Driver fails to complete delivery.
- [ ] Driver enters wrong OTP repeatedly.
- [ ] Delivery is reassigned after pickup: define policy before implementation.
- [ ] Order is partially available before dispatch.
- [ ] Request expires while driver is viewing it.

---

## 12. Priority Roadmap

### Immediate fixes — P0 Critical

| Priority | Item | Why |
|---|---|---|
| P0 | Verify OTP exposure and broad `select("*")` behavior | Security-sensitive. |
| P0 | Fix `Assigned` active-driver visibility or block pre-ready assignment | Prevent hidden assignments. |
| P0 | Move driver UI actions behind driver-specific service functions | Prepares for RPC hardening. |
| P0 | Add server-side transition RPC plan for pickup/out-for-delivery/cancel/fail | Prevent direct client bypass. |
| P0 | Clarify driver route protection and inactive partner handling | Prevent role/access confusion. |

### Must-have MVP driver features — P0/P1

| Priority | Item | Why |
|---|---|---|
| P0 | Driver online/offline availability | Dispatch cannot work without it. |
| P0 | Delivery request table/workflow | Enables accept/reject. |
| P0 | Accept/reject RPCs with race protection | Prevents duplicate assignment. |
| P1 | Active delivery screen | Makes live delivery usable. |
| P1 | Failed delivery handling | Required for real-world operations. |
| P1 | Delivery history | Basic driver recordkeeping. |

### Vendor dispatch improvements — P1

| Priority | Item | Why |
|---|---|---|
| P1 | Vendor request driver action | Connects store readiness to delivery. |
| P1 | Vendor dispatch status panel | Reduces uncertainty. |
| P1 | Vendor delivery timeline | Gives post-pickup visibility. |
| P1 | Re-request/reassignment after reject/expire/fail | Keeps operations moving. |

### Admin management features — P1/P2

| Priority | Item | Why |
|---|---|---|
| P1 | Admin live driver availability | Needed for operational oversight. |
| P1 | Manual reassignment | Needed for exceptions. |
| P1 | Driver approval/suspension | Trust and safety. |
| P2 | Driver detail/history page | Better management and support. |
| P2 | Delivery event audit trail | Debugging and accountability. |

### Advanced features — P2

| Priority | Item | Why |
|---|---|---|
| P2 | Realtime status subscriptions | Better coordination; after core state model is safe. |
| P2 | Location stale handling | Needed if live tracking remains. |
| P2 | Notification center | Improves reliability of assignments. |
| P2 | Proof of delivery | Dispute prevention. |

### Long-term enhancements — P3

| Priority | Item | Why |
|---|---|---|
| P3 | Driver earnings and payouts | Needed for scale, not first dispatch MVP. |
| P3 | Ratings/performance dashboard | Quality management after enough volume. |
| P3 | Automatic dispatch algorithm | Should wait until manual/request flow is stable. |
| P3 | Route optimization/batching | Useful after higher order volume. |
| P3 | Push notifications/SMS | Important later; realtime/in-app first. |

---

## Recommended build order

1. Phase 1: Stabilize current admin-assigned flow.
2. Phase 2A: Add availability and active delivery screen.
3. Phase 2B: Add delivery request and accept/reject RPCs.
4. Phase 3: Add vendor request-driver and dispatch timeline.
5. Phase 4: Add realtime subscriptions and notification UX.
6. Phase 5: Expand admin driver management and audit trail.
7. Phase 6: Add earnings, ratings, and performance.

Do not begin automatic dispatch until:

- Driver availability exists.
- Request accept/reject is reliable.
- Status transitions are server-validated.
- Reassignment/failure handling exists.
- Vendor/admin can see delivery status clearly.
