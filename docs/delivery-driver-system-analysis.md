# Delivery Driver / Delivery Partner System Analysis

Investigation-only analysis for the Delivery Driver / Delivery Partner side of the Zembil Market / Mela Marketplace web app.

Scope rules followed:

- Documentation only.
- No application code changes.
- No refactors.
- No database schema changes.
- No Supabase policy changes.
- No delivery feature implementation.

## Files inspected

Frontend routing and role access:

- `client/src/App.tsx`
- `client/src/components/ProtectedRoute.tsx`
- `client/src/context/AuthContext.tsx`
- `client/src/types/index.ts`

Delivery partner frontend:

- `client/src/pages/delivery/DeliveryLogin.tsx`
- `client/src/pages/delivery/DeliveryLayout.tsx`
- `client/src/pages/delivery/DeliveryDashboard.tsx`
- `client/src/components/Delivery/DeliveryOrderCard.tsx`
- `client/src/components/Delivery/OtpModal.tsx`
- `client/src/components/Delivery/CancelModal.tsx`

Admin and vendor delivery flow:

- `client/src/pages/admin/AdminDeliveryPartners.tsx`
- `client/src/pages/admin/AdminOrders.tsx`
- `client/src/pages/vendor/VendorOrders.tsx`
- `client/src/pages/vendor/VendorOrderPrepare.tsx`
- `client/src/lib/db/vendorOrders.ts`

Customer tracking and map:

- `client/src/pages/OrderTracking.tsx`
- `client/src/components/OrderTracking/LiveMap.tsx`

Supabase client services:

- `client/src/lib/db/deliveryPartners.ts`
- `client/src/lib/db/orders.ts`
- `client/src/lib/db/notifications.ts`
- `client/src/lib/db/mappers.ts` was not deeply inspected in this pass; only referenced indirectly through service imports.

Backend / Supabase:

- `supabase/schema.sql`
- `supabase/functions/admin-create-delivery-partner/index.ts`

Not found in current codebase inspection:

- `client/src/pages/delivery/*` routes beyond login/layout/dashboard.
- `client/src/lib/db/driverStatus.ts`
- `client/src/lib/db/dispatch.ts`
- `client/src/lib/db/locationTracking.ts`
- A separate `delivery_requests` table.
- A separate `delivery_status` field/table.
- A `driver_earnings` or `delivery_earnings` table.
- A driver onboarding application screen.
- A vendor-facing driver assignment screen.
- Push-notification service files.
- SMS/email notification service files.

---

# Part 1: Executive Summary

## Overall condition of the delivery driver side

The delivery-driver side exists and is more than a placeholder. The app has a dedicated `/delivery/login` page, a dedicated `/delivery` dashboard, a `delivery_partners` table, admin-created delivery partners, assigned-order fetching, pickup/drop-off information, Google Maps links, location sharing, customer live-map polling, OTP-based delivery completion, cancellation, and in-app notification RPCs.

However, the delivery flow is not yet a complete marketplace dispatch system. It is closer to an admin-assigned delivery workflow than a real-time driver marketplace. Drivers do not currently browse available requests, accept/reject offers, set true online/offline availability, receive push notifications, see earnings, see performance, or manage onboarding/verification. Vendors can prepare orders and mark them ready, but vendors do not dispatch drivers themselves. Admins assign drivers from the admin order screen.

## What exists today

- Delivery partner login at `/delivery/login`.
- Delivery dashboard at `/delivery`.
- Delivery partner identity stored in `delivery_partners.auth_user_id`.
- Admin can create delivery partner auth users through the `admin-create-delivery-partner` Supabase Edge Function.
- Admin can activate/deactivate delivery partners.
- Admin can assign a delivery partner to an order.
- Assigned orders appear in the delivery dashboard.
- Driver can see active/completed assigned deliveries.
- Driver can see pickup store details and drop-off/customer details.
- Driver can open pickup/drop-off in Google Maps when coordinates exist.
- Driver can mark order `Picked Up` and `Out for Delivery`.
- Driver can complete delivery through the `complete_delivery` RPC using customer OTP.
- Driver can cancel an assigned delivery/order using `updateOrderStatus(..., "Cancelled")`.
- Driver can share live coordinates into `orders.live_location`.
- Customer order tracking polls `orders.live_location` and renders a Leaflet map.
- Notifications table and notification RPCs exist for order status changes and assignment.

## What is missing

- Public delivery-partner application/onboarding flow.
- Approval/verification workflow beyond admin-created partner row and `is_active` toggle.
- Dedicated `DELIVERY` enum role in `profiles.role`; current `UserRole` only includes `CUSTOMER`, `VENDOR`, and `ADMIN`.
- Driver route protection through a shared route guard; the delivery layout performs its own partner check instead.
- True online/offline availability state.
- Driver request queue.
- Accept/reject delivery workflow.
- Vendor-side dispatch/assignment tools.
- Automatic dispatch algorithm.
- Separate order status and delivery status models.
- Server-side status-transition validation for all non-OTP updates.
- Driver earnings, payout, tips, ratings, failed-delivery metrics, or export tools.
- Push notifications and SMS/email delivery alerts.
- Realtime order subscriptions for drivers/vendors/customers; the current vendor and customer flows rely primarily on polling/manual refresh.
- Stale-location handling and privacy rules that clear/limit live location after completion.

## Biggest risks

1. **Status security risk:** `orders update relevant` allows admins, vendors for the store, and assigned partners to update orders. Frontend code restricts driver status actions, but direct client updates could still change fields/statuses unless RLS/RPC constraints are tightened.
2. **Dispatch gap:** Drivers only see already-assigned orders. There is no request/accept/reject workflow, so the system cannot operate like a real driver marketplace yet.
3. **Role-model mismatch:** Delivery partners are real users, but `profiles.role` and `UserRole` do not include `DELIVERY`; delivery access depends on a separate `delivery_partners` row.
4. **Availability gap:** `delivery_partners.is_active` is an admin activation flag, not a driver availability/online status.
5. **Realtime gap:** In-app notification records exist, but driver dashboard does not subscribe to realtime notifications or orders.
6. **Location privacy/staleness gap:** `orders.live_location` stores latest coordinates but there is no explicit stale cutoff, active-delivery-only database constraint, or post-delivery cleanup.
7. **Mobile operational risk:** The driver dashboard is card-based and usable, but actions are not structured as a focused active-delivery workflow with clear next step, safety spacing, and confirmation hierarchy.

## Highest-priority next fixes

1. Create a safe delivery status model and server-side status-transition RPCs.
2. Add driver online/offline availability distinct from admin activation.
3. Add admin assignment hardening and optional dispatch request model.
4. Add driver accept/reject workflow.
5. Add driver active-delivery screen with one primary next action.
6. Add realtime subscriptions/notifications for assigned delivery requests and status updates.
7. Add location staleness handling and privacy cleanup.
8. Add earnings/history after the core lifecycle is reliable.

---

# Part 2: Current Driver System Map

## Driver routes

Defined in `client/src/App.tsx`:

| Route | Component | Current behavior |
|---|---|---|
| `/delivery/login` | `DeliveryLogin` | Separate login for delivery partners. Authenticates with Supabase email/password, then checks `getMyPartner()`. |
| `/delivery` | `DeliveryLayout` + `DeliveryDashboard` | Delivery partner dashboard. Layout checks `getMyPartner()` and redirects to `/delivery/login` when no partner row is linked. |

Important observation: `/delivery` is not wrapped in the shared `ProtectedRoute`. It is guarded locally inside `DeliveryLayout` by calling `getMyPartner()`. This works functionally, but route protection is inconsistent with customer protected routes.

## Driver screens

| Screen | File | Exists? | Notes |
|---|---|---:|---|
| Delivery login | `client/src/pages/delivery/DeliveryLogin.tsx` | Yes | Checks Supabase auth and then verifies a linked delivery partner row. |
| Delivery shell/layout | `client/src/pages/delivery/DeliveryLayout.tsx` | Yes | Shows top bar, partner name, logout. |
| Delivery dashboard | `client/src/pages/delivery/DeliveryDashboard.tsx` | Yes | Shows active/completed tabs, assigned deliveries, location-sharing toggle. |
| Delivery request inbox | Not found | No | No unassigned/requested orders are shown to drivers. |
| Active delivery detail page | Not found | Partial via card | Delivery actions exist inside order card only. |
| Driver onboarding/application | Not found | No | Admin creates drivers manually. |
| Driver profile/settings | Not found | No | No partner self-service profile. |
| Earnings/history page | Not found | No | Completed tab exists, but no earnings system. |

## Driver components

| Component | File | Purpose |
|---|---|---|
| `DeliveryOrderCard` | `client/src/components/Delivery/DeliveryOrderCard.tsx` | Displays pickup, drop-off, contact info, order total, status, maps links, active actions. |
| `OtpModal` | `client/src/components/Delivery/OtpModal.tsx` | Driver enters customer OTP to complete delivery. |
| `CancelModal` | `client/src/components/Delivery/CancelModal.tsx` | Driver enters cancellation reason and cancels through order status update. |

## Driver database tables

| Table | Relevant columns | Purpose |
|---|---|---|
| `delivery_partners` | `id`, `auth_user_id`, `name`, `email`, `phone`, `avatar`, `vehicle_type`, `is_active`, timestamps | Stores delivery partner profiles and links them to Supabase Auth users. |
| `orders` | `delivery_partner_id`, `delivery_otp`, `live_location`, `status`, `status_history`, `shipping_address` | Stores delivery assignment, OTP, current location, and status. |
| `notifications` | `user_id`, `audience`, `type`, `title`, `message`, `entity_type`, `entity_id`, `read_at` | Stores in-app notifications, including delivery assignment records. |

## Driver services/hooks

No dedicated React hook was found for driver work. Delivery logic is implemented through service functions and component state.

| File/function | Purpose |
|---|---|
| `getMyPartner()` in `client/src/lib/db/deliveryPartners.ts` | Looks up current authenticated user in `delivery_partners.auth_user_id`. |
| `getMyDeliveries(partnerId, status)` | Fetches orders where `orders.delivery_partner_id = partnerId`, filtered by active/completed status groups. |
| `updateDeliveryLocation(orderId, lat, lng)` | Updates `orders.live_location` JSON with `{ lat, lng, updatedAt }`. |
| `completeDelivery(orderId, otp)` | Calls Supabase RPC `complete_delivery`. |
| `updateOrderStatus(orderId, status, note?)` | Generic order update used by admin, vendor, and delivery flows. |
| `assignDeliveryPartner(orderId, partnerId)` | Admin assignment helper that sets `delivery_partner_id`, creates OTP, and may set status to `Assigned`. |

## Driver permissions

Current access is separated mostly by `delivery_partners.auth_user_id`, RLS policies, and app-level checks.

- `profiles.role` supports `CUSTOMER`, `VENDOR`, `ADMIN` only.
- Delivery partners are not represented as `profiles.role = 'DELIVERY'`.
- Delivery identity is inferred by presence of a row in `delivery_partners` with `auth_user_id = auth.uid()`.
- `orders select relevant` allows the assigned partner to read assigned orders through `public.is_assigned_partner(delivery_partner_id)`.
- `orders update relevant` allows assigned partners to update assigned orders.
- `delivery partners admin or self or linked` lets admins, the partner themself, customers with a linked order, and vendors with a linked order read a delivery partner row.
- `delivery partners admin manage` allows only admins to manage partner records.

## Admin delivery partner tools

| Tool | File | Current capability |
|---|---|---|
| Admin partner list | `client/src/pages/admin/AdminDeliveryPartners.tsx` | Lists partners, active/inactive status, email/phone/vehicle. |
| Add partner modal | `AdminDeliveryPartners.tsx` + `admin-create-delivery-partner` Edge Function | Admin creates auth user and linked `delivery_partners` row. |
| Activate/deactivate partner | `AdminDeliveryPartners.tsx` + `updatePartner()` | Toggles `delivery_partners.is_active`. |
| Assign partner to order | `client/src/pages/admin/AdminOrders.tsx` + `assignDeliveryPartner()` | Admin assigns active partner to order. |

## Vendor dispatch tools

Vendor dispatch tools are not present. Vendors can prepare an order and move it to `Ready for Pickup`, but assignment is admin-owned today.

Current vendor delivery-adjacent flow:

1. Vendor sees store orders in `VendorOrders`.
2. Vendor starts preparation.
3. Vendor prepares items in `VendorOrderPrepare`.
4. Vendor marks all items handled.
5. System sets order to `Ready for Pickup` or `Partially Available`.
6. If partial, vendor can confirm ready later.
7. Admin assigns a driver from `AdminOrders`.

---

# Part 3: Vendor-to-Driver Dispatch Flow

## Current dispatch flow

The current flow is admin-assigned, not vendor-dispatched.

1. Customer places order through `place_order` RPC.
2. Order is inserted into `orders` with status `Placed`.
3. Vendor sees the order in `VendorOrders`.
4. Vendor starts preparing the order.
5. `startPreparingOrder()` changes status to `Preparing`.
6. Vendor marks each item as `picked` or `not_available`.
7. `completeOrderPreparation()` sets status to `Ready for Pickup` or `Partially Available`.
8. Vendor can confirm `Partially Available` order as `Ready for Pickup` through `confirmReadyForPickup()`.
9. Admin opens `AdminOrders` and uses the assign modal.
10. `assignDeliveryPartner()` sets `orders.delivery_partner_id`, generates `orders.delivery_otp`, and may set status to `Assigned` if current status is `Placed` or `Confirmed`.
11. Driver sees the order only if it matches active filters in `getMyDeliveries()`.
12. Driver updates status to `Picked Up`, then `Out for Delivery`, then completes via `complete_delivery` RPC.

## Who assigns drivers today?

Admins assign drivers today through `client/src/pages/admin/AdminOrders.tsx` using `assignDeliveryPartner()` from `client/src/lib/db/orders.ts`.

## Can vendors dispatch drivers?

No. Not found in current codebase inspection.

Vendors can prepare orders and mark readiness. They cannot:

- See available drivers.
- Request a driver explicitly.
- Assign a driver.
- Reassign a driver.
- Cancel/reassign delivery after assignment.
- See driver availability or current driver load.

## Can admins assign drivers?

Yes. Admins can assign active partners from `AdminOrders`. The admin list of partners is loaded from `getAllPartners()` and filtered to active partners in the admin page.

## Missing steps

- Driver requested state.
- Vendor driver request action.
- Available-driver list for vendors.
- Admin assignment status validation.
- Driver accept/reject.
- Assignment timeout.
- Reassignment.
- Dispatch audit trail.
- Delivery request notification delivery/read state.

## Recommended dispatch flow

Recommended future dispatch should separate order preparation, dispatch, assignment, and delivery execution:

1. Customer places order: `Placed`.
2. Store accepts: `Accepted` or current `Confirmed`.
3. Store prepares: `Preparing`.
4. Store marks ready: `Ready for Pickup`.
5. Vendor requests driver: `Driver Requested`.
6. Dispatch creates delivery request row.
7. Driver receives request in realtime/push.
8. Driver accepts/rejects.
9. On accept: assign `delivery_partner_id`, set delivery status `Driver Accepted` or order status `Driver Assigned`.
10. Driver arrives at store: `Arriving at Store` / `At Store`.
11. Driver confirms pickup: `Picked Up`.
12. Driver starts route: `On the Way`.
13. Driver arrives near customer: `Arrived at Customer`.
14. Driver completes with OTP/proof: `Delivered`.
15. Completion writes delivery history and earnings record.

---

# Part 4: Driver Delivery Lifecycle

| Step | Current status | Current implementation | Problem | Recommended improvement | Priority | Complexity |
|---|---|---|---|---|---|---|
| 1. Driver logs in | Exists | `/delivery/login` signs in with Supabase and checks `getMyPartner()`. | Login is separate from app auth role model; no forgot-password/onboarding path. | Keep separate portal or add unified role routing; add recovery/onboarding links. | High | Medium |
| 2. Driver goes online/available | Partial | Dashboard has `Share Location` toggle; admin has `is_active`. | `is_active` means admin activation, not live availability. Location sharing is not availability. | Add `availability_status`, `last_seen_at`, `current_lat/lng` or separate driver presence table. | Critical | Medium |
| 3. Driver receives delivery request | Partial | Assigned delivery notification can be created; dashboard fetches assigned active deliveries. | No request queue; no realtime subscription; no push. Driver must refresh/load dashboard. | Add `delivery_requests`, realtime subscription, notification center, push later. | Critical | Large |
| 4. Driver accepts/rejects delivery | Missing | Not found. Admin assignment directly assigns order. | Cannot confirm driver willingness/capacity. | Add accept/reject actions and assignment timeout/reassignment. | Critical | Medium |
| 5. Driver goes to pickup location | Partial | Card shows store details and Google Maps link if coordinates exist. | No dedicated active route screen; no arrival confirmation; no route ETA. | Add active delivery view with pickup navigation and `Arrived at Store`. | High | Medium |
| 6. Driver confirms pickup | Exists | `DeliveryOrderCard` allows `Ready for Pickup` → `Picked Up`. | Uses generic `updateOrderStatus`; server does not enforce transition sequence. | Move to RPC: `driver_mark_picked_up(order_id)`. | Critical | Medium |
| 7. Driver starts delivery | Exists | `Picked Up` → `Out for Delivery`. | No distinction between pickup confirmed and route started beyond status. | Add explicit `On the Way` or keep `Out for Delivery` with RPC validation. | High | Medium |
| 8. Driver navigates to customer | Partial | Drop-off info and Google Maps link exists if coordinates exist. | No in-app route, ETA, arrival state, or safety-optimized layout. | Add one-tap navigation, customer contact, arrival status. | High | Medium |
| 9. Driver confirms delivery | Exists | `completeDelivery()` calls `complete_delivery` RPC with OTP. | Good security pattern; still lacks proof photo/signature and failure handling. | Keep OTP; add proof of delivery and failed-delivery flow. | High | Medium |
| 10. Driver completes order | Exists | RPC sets status `Delivered`, clears OTP, app refreshes. | No earnings/history record; live location not cleared. | Add earnings/history write and clear/expire live location. | High | Medium |
| 11. Driver sees history/earnings | Partial | Completed tab shows delivered/cancelled orders and dates. | No earnings, fees, tips, filters, ratings, payout. | Add delivery history and earnings screen after core flow. | Medium | Large |

---

# Part 5: Order Status and Delivery Status Review

## Current statuses found in code

The current code uses string statuses directly rather than a database enum for order status.

Statuses found across admin, vendor, customer, and delivery files:

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
- `Packed` appears in customer tracking display context but is not part of admin status options or main vendor/driver status flow.

## Vendor/store preparation statuses

Vendor-owned or vendor-adjacent:

- `Placed`
- `Confirmed`
- `Preparing`
- `Partially Available`
- `Ready for Pickup`
- `Cancelled` in some contexts

Item-level prep statuses:

- `pending`
- `picked`
- `not_available`

## Delivery driver statuses

Driver-owned or driver-adjacent:

- `Ready for Pickup`
- `Picked Up`
- `Out for Delivery`
- `Delivered`
- `Cancelled`

The driver dashboard also filters active orders by `Ready for Pickup`, `Picked Up`, and `Out for Delivery`.

Important issue: `Assigned` is created by `assignDeliveryPartner()` in some cases, but `getMyDeliveries(partnerId, "active")` does not include `Assigned`. This can hide newly assigned orders if the assignment sets the order to `Assigned`. Since `assignDeliveryPartner()` only sets `Assigned` when the order was `Placed` or `Confirmed`, an admin assignment before `Ready for Pickup` could create a driver-invisible assignment.

## Customer-facing statuses

Customer tracking recognizes:

- `Placed`
- `Confirmed`
- `Preparing`
- `Partially Available`
- `Ready for Pickup`
- `Assigned`
- `Packed`
- `Picked Up`
- `Out for Delivery`
- `Delivered`
- `Cancelled`

Customer live-location polling stops for:

- `Placed`
- `Confirmed`
- `Preparing`
- `Ready for Pickup`
- `Delivered`
- `Cancelled`

## Are order status and delivery status separated properly?

No. `orders.status` mixes store preparation, dispatch, delivery execution, customer tracking, cancellation, and terminal states.

This works for a small MVP but will become fragile as dispatch grows. A stronger model would separate:

- `orders.status`: commercial/order lifecycle.
- `orders.prep_status` or item-level prep states: store fulfillment lifecycle.
- `deliveries.status`: driver/delivery lifecycle.
- `delivery_requests.status`: request/offer lifecycle.

## Who can update each status today?

In practice:

- Admin can update any order status from `AdminOrders` select box.
- Vendor can update preparation-related statuses through `vendorOrders.ts` functions.
- Driver can update `Picked Up`, `Out for Delivery`, and `Cancelled` from the UI, and `Delivered` through OTP RPC.
- Customer cannot update delivery statuses from inspected files.

RLS-level behavior:

- `orders update relevant` allows admins, store owners for the order, and assigned partners to update assigned orders.
- There is no RLS-level column restriction or status-transition matrix in the inspected schema.
- The secure `complete_delivery` RPC validates assigned partner and OTP, but the generic `updateOrderStatus()` is used for other status changes.

## Current system versus recommended lifecycle

| Recommended status | Current status | Notes |
|---|---|---|
| Order placed | Exists: `Placed` | Created by `place_order`. |
| Order accepted by store | Partial: `Confirmed` | Status exists, but vendor flow often starts preparing directly. |
| Preparing | Exists | Vendor flow uses this. |
| Ready for pickup | Exists: `Ready for Pickup` | Vendor preparation completion uses this. |
| Driver requested | Missing | No request state/table. |
| Driver assigned | Partial: `Assigned` + `delivery_partner_id` | Admin assignment exists; active driver dashboard does not include `Assigned`. |
| Driver accepted | Missing | No accept/reject. |
| Driver arriving at store | Missing | Not found. |
| Picked up | Exists: `Picked Up` | Driver action. |
| On the way | Exists as `Out for Delivery` | Driver action. |
| Arrived at customer | Missing | Not found. |
| Delivered | Exists | OTP RPC. |
| Cancelled | Exists | Generic status update. |
| Failed delivery | Missing | Not found. |

## Recommended future status model

Minimum safe MVP without creating many tables:

- Keep `orders.status` for customer/vendor high-level state.
- Add a restricted RPC for each driver transition:
  - `driver_accept_delivery(order_id)`
  - `driver_reject_delivery(order_id, reason)`
  - `driver_mark_picked_up(order_id)`
  - `driver_mark_out_for_delivery(order_id)`
  - `driver_complete_delivery(order_id, otp)`
  - `driver_report_failed_delivery(order_id, reason)`
- Add transition validation in SQL.
- Include `Assigned` in active driver deliveries if it remains in use.

Stronger architecture:

- Create `deliveries` table with `order_id`, `delivery_partner_id`, `status`, timestamps, live tracking fields, and proof-of-delivery fields.
- Create `delivery_requests` table for offer/accept/reject/timeout.
- Keep `orders.status` customer-facing and derive it from delivery events.

---

# Part 6: UI/UX Analysis

## What is clear

- Delivery login is visually distinct and named `Delivery Partner Portal`.
- Delivery layout is simple and focused.
- Driver dashboard uses tabs: `Active` and `Completed`.
- Empty states are present for active/completed deliveries.
- Pickup and drop-off sections are separated clearly.
- Store and customer phone numbers are visible when available.
- Google Maps links are useful for actual driver movement.
- OTP modal explains that the driver should ask the customer for the 6-digit OTP.
- Cancel modal asks for a reason.

## What is confusing

- `Share Location` is not the same as `Go Online`, but drivers may interpret it as availability.
- The driver cannot tell whether they are waiting for requests or only seeing assigned work.
- The current dashboard does not show a single top-priority active delivery card.
- `Cancel` appears near normal delivery actions and could be tapped accidentally during real driving conditions.
- `Picked Up` and `Out for Delivery` are separate actions, but the UI does not present a guided timeline or next-step state machine.
- `Assigned` can exist in customer tracking/admin status but is not included in active driver delivery filtering.
- No earnings or daily summary makes the driver portal feel operationally incomplete.

## What is missing

- Driver online/offline status.
- Available requests/incoming request screen.
- Accept/reject controls.
- Active delivery detail screen.
- One primary next action per delivery state.
- Arrival at pickup/drop-off states.
- Support/escalation button.
- Safer cancellation/failure workflow.
- Earnings/history section.
- Notification center or realtime assignment alert.
- Profile/document verification UI.

## Driver dashboard redesign recommendation

Recommended dashboard structure:

1. **Status header**
   - Driver name.
   - Online/offline toggle.
   - Admin active/approved state display.
   - Last location update indicator.

2. **Current assignment / next action**
   - Show one current active delivery first.
   - Large next action button: `Navigate to Pickup`, `Mark Picked Up`, `Start Delivery`, `Complete Delivery`.
   - Secondary actions: call store, call customer, issue/help.

3. **Incoming requests**
   - Request cards with pickup, drop-off area, estimated distance/time, fee if available.
   - Accept/reject with timeout.

4. **Assigned/queued deliveries**
   - Lower-priority list after current job.

5. **Completed today**
   - Count, earnings, cancellations/failures.

6. **History**
   - Date filters and completed delivery list.

## Active delivery screen recommendation

Create route: `/delivery/orders/:orderId`.

Recommended sections:

- Status timeline.
- Pickup card: store name, address, phone, map button.
- Drop-off card: customer name, address, phone, instructions, map button.
- Item summary.
- Next action button.
- Support/failure/cancel section separated below the primary action.
- Location sharing state with last update timestamp.

## Mobile usability risks

- Drivers may use the web app while moving; buttons must be large, sparse, and state-specific.
- Cancel/failure actions should be visually separated from routine actions.
- Pickup and delivered confirmations should require deliberate confirmation.
- Small text and dense order cards can slow decision-making.
- Manual refresh/polling is not reliable enough for dispatch.

---

# Part 7: Technical Architecture Analysis

## Relevant frontend files

| File | Current role |
|---|---|
| `client/src/App.tsx` | Defines `/delivery/login` and `/delivery` routes. |
| `client/src/pages/delivery/DeliveryLogin.tsx` | Delivery partner login and partner-row validation. |
| `client/src/pages/delivery/DeliveryLayout.tsx` | Delivery shell and access check. |
| `client/src/pages/delivery/DeliveryDashboard.tsx` | Fetches assigned deliveries, location sharing, status actions, OTP/cancel modals. |
| `client/src/components/Delivery/DeliveryOrderCard.tsx` | Driver delivery card and action UI. |
| `client/src/components/Delivery/OtpModal.tsx` | OTP confirmation UI. |
| `client/src/components/Delivery/CancelModal.tsx` | Cancellation reason UI. |
| `client/src/pages/admin/AdminDeliveryPartners.tsx` | Admin partner CRUD-lite: create, activate/deactivate. |
| `client/src/pages/admin/AdminOrders.tsx` | Admin order list, status updates, delivery assignment modal. |
| `client/src/pages/vendor/VendorOrders.tsx` | Vendor order list and preparation entry point. |
| `client/src/pages/vendor/VendorOrderPrepare.tsx` | Vendor item prep and ready-for-pickup workflow. |
| `client/src/pages/OrderTracking.tsx` | Customer tracking, OTP display, live location polling. |
| `client/src/components/OrderTracking/LiveMap.tsx` | Leaflet map for customer delivery tracking. |

## Relevant backend/database files

| File | Current role |
|---|---|
| `supabase/schema.sql` | Tables, RLS policies, helper functions, notification RPCs, `place_order`, `complete_delivery`. |
| `supabase/functions/admin-create-delivery-partner/index.ts` | Admin-only Edge Function for creating partner auth user and `delivery_partners` row. |

## Supabase schema review

Important tables:

- `profiles`: user account profile with enum role `CUSTOMER`, `VENDOR`, `ADMIN`.
- `delivery_partners`: linked driver profile table with `auth_user_id`.
- `orders`: stores assignment and delivery fields directly: `delivery_partner_id`, `delivery_otp`, `live_location`.
- `notifications`: stores in-app notifications by `user_id` and `audience`.

Important functions:

- `is_admin()`
- `is_vendor_for_store(store_uuid)`
- `is_assigned_partner(p_partner_id)`
- `can_view_partner(p_partner_id)`
- `notify_order_placed(order_uuid)`
- `notify_order_status_changed(order_uuid, new_status)`
- `notify_delivery_assigned(order_uuid)`
- `complete_delivery(order_uuid, otp_input)`
- `place_order(cart, shipping)`

## RLS review

Positive:

- RLS is enabled on key tables.
- Customers can only select their own orders.
- Vendors can select/update orders for their own store.
- Assigned delivery partners can select/update assigned orders.
- Delivery partner rows can be selected by admin, self, or linked customer/vendor.
- Delivery partner management is admin-only.
- `complete_delivery` validates assigned partner and OTP server-side.

Risk:

- The broad `orders update relevant` policy allows assigned partners and vendors to update order rows directly if they can call Supabase from the client.
- The app uses frontend checks to restrict driver statuses, but server-side transition validation is incomplete outside `complete_delivery`.
- `delivery_otp` may be selected in `ORDER_FULL` and typed in `Order`, depending on RLS and client selections. The comment says OTP should not be exposed through normal reads, but `orders.ts` selects `*`, so this deserves immediate verification.
- No column-level restriction prevents drivers from changing `live_location`, `status`, `status_history`, or other updateable order columns through direct client calls.

## RPC/service review

Good pattern:

- `place_order` and `complete_delivery` are server-side RPCs.
- `complete_delivery` is the safest delivery action because it validates assignment and OTP.

Needs hardening:

- `updateOrderStatus()` is generic and used by admin, vendor, and delivery flows.
- Driver pickup/progress/cancel should use dedicated RPCs.
- Admin assignment should validate current status and only assign active partners.
- Dispatch should have explicit assignment/request records.

## Realtime review

- `notifications` is added to `supabase_realtime` publication in `supabase/schema.sql`.
- No inspected delivery dashboard code uses `supabase.channel()` for realtime assigned deliveries or notifications.
- Vendor orders use manual refresh and a 30-second polling interval.
- Customer tracking polls `getOrderLocation()` every 10 seconds during active delivery phases.

Conclusion: backend is partly ready for realtime notifications, but frontend realtime delivery behavior is not implemented in inspected files.

## Location tracking review

Current implementation:

- Driver toggles `Share Location`.
- Browser geolocation `watchPosition` starts if active orders exist and tracking is enabled.
- Location is written every watch update and every 10 seconds to `orders.live_location`.
- Customer tracking polls `orders.live_location` every 10 seconds and renders Leaflet map.

Missing:

- Permission explainer/onboarding.
- Last update visible to driver/customer.
- Stale-location cutoff.
- Location cleared after delivery/cancel.
- Location stored separately from order history.
- Vendor/admin live map.
- Privacy policy or active-delivery-only enforcement.

## Notification review

Current implementation:

- Notification table exists.
- Notification RPCs exist.
- `notify_delivery_assigned()` creates a `DELIVERY` notification for the assigned partner and a customer notification.
- `notify_order_status_changed()` creates customer notifications and vendor cancellation notification.

Missing:

- Driver notification center UI.
- Realtime notification subscription in delivery dashboard.
- Push notifications.
- SMS/email notifications.
- Stale request expiration alerts.
- Assignment acceptance/rejection notifications.

---

# Part 8: Missing Features List

## Critical

| Feature | Role affected | Why it matters | Recommended location | Required database changes | Complexity |
|---|---|---|---|---|---|
| Driver online/offline availability | Driver, admin, vendor | Dispatch needs to know who is actually working. | Driver dashboard header; admin partner list. | Add `availability_status`, `last_seen_at`, possibly `current_location` or `driver_presence`. | Medium |
| Driver request/accept/reject workflow | Driver, admin, vendor | Admin assignment alone does not confirm capacity or willingness. | `/delivery` incoming requests; admin orders. | Add `delivery_requests` table or delivery status fields. | Large |
| Server-side driver status RPCs | Driver, customer, vendor, admin | Prevents invalid or unauthorized status changes. | Service layer replacing direct `updateOrderStatus` for driver actions. | Add RPCs and possibly status transition validation function. | Medium |
| Include/fix `Assigned` active-driver visibility | Driver, admin | Assigned orders can be hidden if status is `Assigned`. | `getMyDeliveries()` active status filter. | No schema change if status remains. | Small |
| Location stale/privacy handling | Driver, customer, admin | Prevents inaccurate tracking and privacy leakage. | Driver dashboard, customer tracking. | Add `live_location_updated_at` or structured delivery tracking table; clear on terminal states. | Medium |

## High priority

| Feature | Role affected | Why it matters | Recommended location | Required database changes | Complexity |
|---|---|---|---|---|---|
| Driver onboarding/application | Driver, admin | Allows scaling without manual admin-only creation. | Public `/delivery/apply`; admin review. | Add application/document fields or table. | Large |
| Driver approval/verification | Driver, admin, customer | Safety and marketplace trust. | Admin delivery partners; driver profile. | Add approval status, document references, reviewed fields. | Medium |
| Active delivery detail screen | Driver | Current card UI is not enough for real operations. | `/delivery/orders/:orderId`. | No immediate schema change. | Medium |
| Vendor driver request action | Vendor, admin, driver | Vendor should request pickup when order is ready. | Vendor order detail/ready screen. | Delivery request/dispatch fields. | Medium |
| Realtime assigned delivery updates | Driver, admin, customer | Delivery requests must be timely. | Delivery dashboard subscription. | Enable realtime on relevant table(s); maybe already needed for notifications. | Medium |
| Failed delivery handling | Driver, customer, admin | Real deliveries fail; system needs recovery. | Active delivery screen; admin order detail. | Add failure reason/status fields or delivery events. | Medium |

## Medium priority

| Feature | Role affected | Why it matters | Recommended location | Required database changes | Complexity |
|---|---|---|---|---|---|
| Earnings page | Driver, admin | Driver motivation and payout transparency. | `/delivery/earnings`; admin partner detail. | Add earnings/delivery fee/tip/payout tables. | Large |
| Delivery history filters | Driver, admin | Operational records and support. | Delivery dashboard/history page. | Optional indexes or deliveries table. | Medium |
| Ratings/performance | Driver, customer, admin | Quality management. | Customer post-delivery; admin partner detail. | Add ratings/reviews/performance fields. | Medium |
| Proof of delivery | Driver, customer, admin | Dispute prevention. | OTP modal/complete flow. | Storage bucket + proof fields. | Medium |
| Support escalation | Driver, vendor, customer, admin | Real-world issues need resolution. | Driver active delivery screen. | Support tickets/messages table. | Medium |

## Low priority

| Feature | Role affected | Why it matters | Recommended location | Required database changes | Complexity |
|---|---|---|---|---|---|
| Export summaries | Driver, admin | Useful for accounting after payout system exists. | Earnings/history page. | Depends on earnings/history model. | Small |
| Advanced route optimization | Admin, driver | Useful after order volume grows. | Dispatch/admin tools. | Requires batching/location history. | Large |
| Driver document expiration reminders | Driver, admin | Compliance helper. | Admin partner detail; driver profile. | Document metadata and expiry fields. | Medium |

---

# Part 9: Recommended Implementation Plan

## Phase A: Make current delivery flow safe and understandable

Goal:

- Harden the current admin-assigned delivery flow before adding dispatch complexity.

Files likely involved:

- `client/src/pages/delivery/DeliveryDashboard.tsx`
- `client/src/components/Delivery/DeliveryOrderCard.tsx`
- `client/src/lib/db/deliveryPartners.ts`
- `client/src/lib/db/orders.ts`
- `supabase/schema.sql`

Database changes:

- Add/replace RPCs for driver transitions.
- Add status-transition validation.
- Consider removing direct driver reliance on generic `updateOrderStatus()`.
- Include `Assigned` in driver active query or avoid assigning pre-ready orders.

Testing steps:

- Driver can only see assigned orders.
- Driver cannot update unassigned orders.
- Driver cannot skip from `Ready for Pickup` directly to `Delivered` without OTP.
- Driver cannot complete with wrong OTP.
- Driver cannot modify another driver’s order.
- Assigned `Assigned` orders are visible or assignment is blocked until ready.

Priority: Critical  
Complexity: Medium

## Phase B: Add driver assignment and request workflow

Goal:

- Move from direct admin assignment toward a request/accept/reject workflow.

Files likely involved:

- `client/src/pages/admin/AdminOrders.tsx`
- `client/src/pages/vendor/VendorOrders.tsx`
- `client/src/pages/vendor/VendorOrderPrepare.tsx`
- `client/src/pages/delivery/DeliveryDashboard.tsx`
- `client/src/lib/db/deliveryPartners.ts`
- New service file such as `client/src/lib/db/deliveryRequests.ts`

Database changes:

- Add `delivery_requests` table or `deliveries` table.
- Add request statuses: `pending`, `accepted`, `rejected`, `expired`, `cancelled`.
- Add assignment timestamps and audit fields.

Testing steps:

- Vendor/admin can request a driver.
- Driver sees request.
- Driver can accept.
- Driver can reject with reason.
- Accepted request assigns the driver.
- Rejected/expired request can be reassigned.

Priority: Critical  
Complexity: Large

## Phase C: Add active delivery and location tracking

Goal:

- Provide a safe, real delivery workflow with accurate tracking.

Files likely involved:

- New `client/src/pages/delivery/DeliveryOrderDetail.tsx`
- `client/src/pages/delivery/DeliveryDashboard.tsx`
- `client/src/components/Delivery/*`
- `client/src/pages/OrderTracking.tsx`
- `client/src/components/OrderTracking/LiveMap.tsx`
- `client/src/lib/db/deliveryPartners.ts`

Database changes:

- Add stale timestamp field or move location to `deliveries`/`driver_locations`.
- Add location cleanup/expiry logic.
- Add optional arrival statuses.

Testing steps:

- Location permission denied state is clear.
- Location updates only during active delivery.
- Customer sees updated location.
- Stale location shows warning/placeholder.
- Location clears or stops after delivered/cancelled.

Priority: High  
Complexity: Medium/Large

## Phase D: Add notifications and realtime updates

Goal:

- Make delivery assignment and status updates timely across driver, vendor, customer, and admin.

Files likely involved:

- `client/src/lib/db/notifications.ts`
- Delivery dashboard subscription code.
- Vendor orders subscription code.
- Customer tracking subscription or continued polling fallback.
- Possibly a shared notification context/hook.

Database changes:

- Ensure realtime publication includes required tables.
- Add notification types for request accepted/rejected/expired, pickup, failed delivery.
- Later: push token table for mobile/PWA push.

Testing steps:

- Driver receives new assignment/request without refresh.
- Vendor sees driver accepted/picked up/out for delivery without manual refresh.
- Customer sees status changes quickly.
- Notifications do not leak across users.

Priority: High  
Complexity: Medium

## Phase E: Add earnings, history, and performance

Goal:

- Make driver portal complete for ongoing delivery partner operations.

Files likely involved:

- New `/delivery/history` and `/delivery/earnings` pages.
- Admin partner detail/performance page.
- `client/src/lib/db/deliveryPartners.ts` or new `driverEarnings.ts`.

Database changes:

- Add `delivery_earnings`, `driver_payouts`, or derive from completed `deliveries`.
- Add delivery fee/tip/bonus fields.
- Add ratings table or delivery performance fields.

Testing steps:

- Completed delivery creates earning record.
- Driver can filter by date.
- Cancelled/failed deliveries are separated from paid deliveries.
- Admin can audit totals.

Priority: Medium  
Complexity: Large

---

# Part 10: Acceptance Criteria for Future Build

Use this checklist when the delivery driver system is considered complete and usable.

## Driver access and account

- [ ] Driver can log in.
- [ ] Driver can recover password.
- [ ] Driver can see account/profile details.
- [ ] Driver account is linked to a verified delivery partner record.
- [ ] Driver cannot access another driver’s orders.
- [ ] Non-driver accounts cannot access `/delivery` pages.

## Availability and dispatch

- [ ] Driver can go online/offline.
- [ ] Admin can see driver availability.
- [ ] Vendor or admin can request/assign a driver.
- [ ] Driver receives delivery requests in realtime.
- [ ] Driver can accept delivery.
- [ ] Driver can reject delivery.
- [ ] Rejected/expired requests can be reassigned.

## Pickup and active delivery

- [ ] Driver can see pickup/store info.
- [ ] Driver can call/store-contact from the app.
- [ ] Driver can open pickup navigation.
- [ ] Driver can confirm pickup.
- [ ] Driver can see customer/drop-off info.
- [ ] Driver can call/customer-contact from the app.
- [ ] Driver can open customer navigation.
- [ ] Driver can share location during active delivery.
- [ ] Driver can stop sharing location after completion/cancellation.

## Delivery completion and exception handling

- [ ] Driver can confirm delivery with OTP.
- [ ] Driver can upload proof of delivery if required.
- [ ] Driver can report failed delivery.
- [ ] Driver can cancel/escalate with reason.
- [ ] Status transitions are validated server-side.
- [ ] Invalid status skips are blocked.

## Customer/vendor/admin visibility

- [ ] Customer can track delivery progress.
- [ ] Customer can see delivery partner contact/action when appropriate.
- [ ] Customer live map handles stale/no-location states.
- [ ] Vendor can see delivery progress.
- [ ] Admin can assign/reassign driver.
- [ ] Admin can manage delivery partners.
- [ ] Admin can review driver performance and delivery history.

## Earnings and history

- [ ] Driver can see delivery history.
- [ ] Driver can see earnings.
- [ ] Driver can see delivery fees and tips if supported.
- [ ] Driver can filter history/earnings by date.
- [ ] Admin can audit delivery payout records.

## Security and QA

- [ ] RLS prevents unauthorized access.
- [ ] Direct client calls cannot bypass delivery status rules.
- [ ] OTP is not exposed to unauthorized readers.
- [ ] Location is only shared during active delivery.
- [ ] Mobile UI is usable during a real delivery.
- [ ] Loading, empty, and error states are present.
- [ ] Accessibility labels exist for critical actions.
- [ ] Delivery cancellation/failure actions are visually separated from normal progress actions.
