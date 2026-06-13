# Zembil Market: Product and Technical Understanding

This document turns the repository review into a shared understanding of what each part of the current Zembil Market application means, why it matters, and what should happen next.

## Part 1: Executive Summary

### What this part means

Zembil Market is a React, Vite, and TypeScript web marketplace backed by Supabase. It is not currently a React Native or Expo mobile app. The product is positioned as a local grocery and everyday-goods delivery marketplace for Addis Ababa.

### Current maturity

The app is beyond a simple prototype because it already includes core marketplace flows:

- Customer browsing, search, filtering, cart, checkout, orders, and tracking.
- Vendor application, store dashboards, product management, inventory controls, and order preparation.
- Admin management for products, stores, orders, and delivery partners.
- Supabase Auth, Postgres/RLS, Storage, and a server-side order placement RPC.
- Product detail views with multiple images, descriptions, specifications, stock, and primary-image selection.

### Main takeaway

The next phase should focus on hardening the core marketplace experience rather than rebuilding it. The highest-value work is to secure protected customer routes, align cart and checkout totals, clean up checkout contact/address fields, add trust features, and improve vendor order-adjustment workflows.

## Part 2: Current System and User Roles

### What this part means

The application is organized around four practical marketplace actors:

1. Customers buy groceries and track orders.
2. Vendors manage stores, products, stock, and order preparation.
3. Admins supervise stores, products, orders, and delivery partners.
4. Delivery partners have a separate delivery flow.

The code types currently define `CUSTOMER`, `VENDOR`, and `ADMIN`, while the product documentation also describes delivery partners as a role.

### Why it matters

Understanding roles is important because marketplace permissions are different for each actor. A customer should not manage another user's orders, a vendor should not manage another vendor's store, and only admins should approve/suspend stores.

### Main risks

- Customer protected routes must enforce authentication before rendering checkout, order, tracking, and address screens. This has been implemented with `ProtectedRoute`, which waits for auth loading to complete and redirects logged-out users to `/login` with the requested route preserved.
- Vendor access is intentionally open to logged-in users so customers can apply, but approved-vendor dashboards should be clearly separated from application/onboarding states.

### Recommended direction

Use explicit state-based routing:

- Logged-out user: redirect to login for protected customer flows.
- Customer with no store: show vendor application.
- Vendor with pending store: show onboarding/status.
- Vendor with approved store: show dashboard.
- Suspended vendor: show suspension state.
- Admin: allow admin-only areas.

## Part 3: Customer Flow Analysis

### What this part means

The customer journey starts at the home page, continues through browse/search, product cards, product detail modal, add-to-cart, cart sidebar, checkout, and order tracking.

### What already works

- Home page provides discovery through search, featured stores, categories, CTAs, and marketplace content.
- Product listing supports filters, sorting, mobile filters, and empty states.
- Product cards support quick add and detail-modal opening.
- Product detail modal already contains multiple images, thumbnails, swipe/carousel behavior, descriptions, specifications, store name, stock, quantity selection, and add-to-cart.
- Add-to-cart does not interrupt browsing.
- Cart supports quantity updates, item removal, subtotals, delivery fee display, and checkout CTA.
- Checkout uses a step-based flow and creates orders through a server-side RPC.
- Order tracking has status history, delivery partner fields, OTP support, and live-location storage.

### Main gaps

- Mobile search should be easier to access.
- Product cards need more trust/conversion details such as store name, stock signal, ETA, favorites, and review count.
- Cart totals can differ from server-calculated order totals.
- Checkout address/contact fields should be modeled clearly instead of reusing fields for unrelated meanings.
- Customers need support, cancellation, substitutions/refunds, reviews, favorites, reorder, and clearer delivery ETA.

### Recommended direction

Prioritize a reliable shopping path:

1. Select or confirm location.
2. Search/browse stores and products.
3. Open detailed product information.
4. Add items without interruption.
5. Review a server-backed cart summary.
6. Enter clean contact/address/payment data.
7. Place order.
8. Track status with support and notification options.

## Part 4: Store/Vendor Flow Analysis

### What this part means

The vendor flow includes onboarding, store setup, product creation, product image management, dashboard metrics, and order preparation.

### What already works

- Vendors can apply for stores.
- Store approval statuses exist: pending, approved, and suspended.
- Vendors cannot create products for unapproved stores.
- Product creation supports store assignment, images, primary image selection, description, specifications, category, price, original price, unit, stock, organic flag, and active/visible flag.
- Vendor dashboard shows store status, quick actions, revenue, pending orders, product count, low stock, and recent orders.
- Vendor order preparation lets vendors mark items as picked or unavailable and mark orders ready.

### Main gaps

- Vendor onboarding/status and dashboard access should be separated more clearly.
- Product creation is powerful but may feel long on mobile.
- Specifications are free text rather than structured fields.
- Vendors need SKU/barcode, variants, bulk upload/edit, draft/preview, store hours, analytics, notifications, customer messaging, and refund/substitution tooling.

### Recommended direction

Make vendor work operationally efficient:

## Part 5: Delivery Driver / Delivery Partner Flow Analysis

A deeper delivery-driver investigation is documented in [`docs/delivery-driver-system-analysis.md`](delivery-driver-system-analysis.md).

### What already works

- Dedicated delivery login and dashboard routes exist at `/delivery/login` and `/delivery`.
- Delivery partners are stored in `delivery_partners` and linked to Supabase Auth through `auth_user_id`.
- Admins can create delivery partners through the `admin-create-delivery-partner` Supabase Edge Function.
- Admins can activate/deactivate delivery partners and assign partners to orders.
- Drivers can see assigned active/completed deliveries, pickup/drop-off details, map links, and customer/store contact information.
- Drivers can share live location into `orders.live_location`.
- Customers can view live delivery location through order tracking.
- OTP-based delivery completion exists through the `complete_delivery` RPC.

### Main gaps

- Delivery partners are not represented in the `profiles.role` enum; current user roles are `CUSTOMER`, `VENDOR`, and `ADMIN`.
- Driver availability, online/offline state, request queue, accept/reject, and automatic dispatch are missing.
- Vendor-side driver dispatch is missing; vendors prepare orders, but admins assign drivers.
- Order status and delivery status are mixed in `orders.status`.
- Driver pickup/progress/cancel actions still rely partly on generic order status updates instead of dedicated server-side transition RPCs.
- Driver earnings, proof of delivery, failed-delivery flow, ratings, and performance metrics are missing.

### Recommended direction

Harden the current admin-assigned delivery flow first, then add driver availability, request/accept/reject dispatch, active delivery UX, realtime notifications, privacy-safe tracking, and finally earnings/history/performance.
