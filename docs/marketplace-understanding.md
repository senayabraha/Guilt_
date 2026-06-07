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
- Add-to-cart does not interrupt browsing; product cards and product details only update cart state and show confirmation.
- Cart supports quantity updates, item removal, subtotals, estimated delivery fee display, continue shopping, clear cart, and checkout CTA.
- Checkout uses a step-based flow and creates orders through a server-side RPC.
- Order tracking has status history, delivery partner fields, OTP support, and live-location storage.

### Main gaps

- Mobile search should be easier to access.
- Product cards need more trust/conversion details such as store name, stock signal, ETA, favorites, and review count.
- Cart totals are presented as estimates and can still differ from server-calculated order totals until a server-backed preview is added.
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

1. Separate onboarding and approved-dashboard states.
2. Split product creation into sections.
3. Add product preview.
4. Add low-stock and inventory workflows.
5. Add vendor notifications.
6. Complete item-unavailable workflows with customer approval, refunds, or substitutions.

## Part 5: UI/UX and Information Display Review

### What this part means

The current interface has a strong marketplace foundation, but information hierarchy and mobile navigation should become more buyer- and vendor-focused.

### What works

- Public navigation includes Home, Products, Stores, and Deals.
- Search and cart are visible in the main navigation.
- Account menu exposes orders, addresses, vendor entry, and admin entry where appropriate.
- The brand palette is coherent: deep green, fresh green, orange, and cream.
- Rounded cards, soft backgrounds, product modal polish, and vendor stat cards create a consistent look.

### Main gaps

- Mobile search is not prominent enough.
- Customer, vendor, and admin destinations are mixed together in the account menu.
- Vendor navigation should feel more like an operational dashboard.
- Product cards should show more trust signals.
- Checkout forms need clearer labels and field structure.
- Vendor/admin tables should be tested and improved for mobile.
- Empty, loading, error, and accessibility states should be standardized.

### Recommended direction

Use role-specific navigation:

- Customer mobile tabs: Home, Search, Stores, Cart, Account.
- Vendor navigation: Dashboard, Orders, Products, Inventory, Store Settings.
- Admin navigation: Dashboard, Stores, Products, Orders, Delivery, Users, Reports.

## Part 6: Feature Gap Analysis

### What this part means

This part turns observations into a prioritized feature backlog.

### Critical work

- Unified cart/order totals.
- Proper checkout contact and address fields.
- Complete unavailable-item workflows for refunds, substitutions, and customer approval.

### High-priority work

- Favorites/saved items.
- Ratings and reviews.
- Delivery ETA and store preparation time.
- Store profile improvements.
- Customer support/order help.
- Notifications.
- Store hours.

### Medium-priority work

- Product variants/options.
- Structured specifications.
- Bulk product upload/edit.
- Low-stock alerts.
- Sales analytics.
- Delivery/pickup selector.
- Admin user management.

### Low/future work

- Promotions and featured products.
- Loyalty/referrals.
- Reorder previous orders.
- Delivery live-map polish.

## Part 7: Technical and Database Review

### What this part means

The current Supabase schema is strong enough for an MVP but should become more normalized as the marketplace grows.

### Current core data model

The core data model includes:

- `profiles`
- `addresses`
- `stores`
- `products`
- `delivery_partners`
- `orders`

### Current product model

Products already support store ownership, name, description, multiple image URLs, specifications, price, original price, legacy primary image, category, unit, stock, organic flag, active flag, rating, and review count.

For scale, product images should eventually move from a text array to a `product_images` table with sort order, primary flag, alt text, and metadata.

### Current order model

Orders currently store items and status history as JSONB. This is acceptable for MVP speed, but normalized `order_items`, `order_status_events`, `order_adjustments`, and refund/substitution tables will make reporting, item-level preparation, refunds, and analytics easier.

### Security understanding

RLS protects backend data, but frontend route protection still matters because logged-out users should be redirected before they reach checkout, orders, tracking, or address screens. The customer route guard now handles this redirect while preserving the requested URL for post-login return.

### Recommended direction

- Keep `ProtectedRoute` enforced for checkout, orders, order tracking, and addresses.
- Add a `preview_order` RPC or equivalent shared totals source.
- Normalize order/product image data when operational complexity increases.
- Add check constraints or RPC-controlled transitions for order statuses.
- Add notifications and reviews as first-class tables.

## Part 8: Recommended Improved Flows

### Customer flow

The improved customer flow should be:

1. Open app.
2. Select delivery location.
3. Browse nearby/open stores and categories.
4. Search/filter products and stores.
5. Open product detail modal.
6. Review images, description, specs, store, ETA, and reviews.
7. Add to cart without interrupting shopping.
8. Continue shopping.
9. Open cart manually.
10. Review store name, delivery fee, minimum order, ETA, and quantities.
11. Checkout with clean contact/address/payment fields.
12. Review final total from server preview.
13. Place order.
14. Track order status.
15. Receive notifications.
16. Contact support or reorder later.

### Vendor flow

The improved vendor flow should be:

1. Log in as vendor.
2. Complete store profile.
3. View approval status.
4. Enter dashboard after approval.
5. Add product through a sectioned form.
6. Upload and order images.
7. Add structured details/specifications.
8. Preview and publish product.
9. Manage inventory and availability.
10. Receive new-order notifications.
11. Prepare orders with item-level states.
12. Trigger substitution/refund/customer approval when an item is unavailable.
13. Mark orders ready.
14. Review analytics and low-stock alerts.

## Part 9: Prioritized Action Plan

### Phase 1: Critical hardening

1. Keep auth checks verified for protected customer routes.
2. Clean up checkout contact/address data modeling.
3. Align cart, checkout, and final order totals with a single pricing source.
4. Define the first version of unavailable-item order adjustments.

### Phase 2: Trust and conversion

1. Add mobile search access.
2. Add store name, low-stock signals, ETA, and favorites to product cards.
3. Add store link, policy, ETA, and review areas to product detail.
4. Add store hours and closed-state logic.
5. Add customer support entry points on order screens.

### Phase 3: Vendor operations

1. Add vendor onboarding/status screens.
2. Improve low-stock lists and restock actions.
3. Add notifications for vendors and customers.
4. Add structured product specs.
5. Add basic analytics and time filters.

### Phase 4: Marketplace scale

1. Add reviews and rating aggregation.
2. Add normalized order items.
3. Add product image metadata table.
4. Add product variants.
5. Add promotions, bulk upload, loyalty, and advanced delivery tooling.

## Part 10: QA Checklist

### What this part means

The QA checklist is a practical acceptance-test guide. It should be used before release and after major changes to confirm that customer, vendor, admin, security, and mobile flows still work.

### Key QA groups

- Customer browsing: home, search, filters, sorting, empty states.
- Product detail: modal, image carousel, stock, quantity, fallback content.
- Add-to-cart: quick add, toast, count, one-store rule, cart controls.
- Checkout: auth redirect, empty cart, address/contact, payment, review, order placement, stock decrement.
- Order tracking: timeline, store, delivery partner, OTP visibility, live-location fallback.
- Vendor onboarding/store: application, pending/approved/suspended states, settings.
- Vendor products: approved-store selection, images, primary image, description, specifications, visibility, edit behavior.
- Vendor orders: filtering, preparation, unavailable reasons, ready state, customer status updates.
- Admin: authorization, store approval/suspension, products, orders, delivery partner management.
- Security/RLS: users can only access the data their role permits.
- Mobile: product grid, cart, modal, checkout, vendor tables, navbar search, tap targets, keyboard safety.

## Bottom Line

Zembil Market already contains many important marketplace features. The best next move is to strengthen the existing foundation:

1. Keep protected routing covered by auth checks and regression QA.
2. Make checkout and totals reliable.
3. Improve trust signals on product, store, and order screens.
4. Add vendor notifications and order-adjustment workflows.
5. Normalize marketplace data as order volume and operational complexity grow.
