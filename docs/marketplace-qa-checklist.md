# Marketplace Final QA Checklist

## Integrated Review Summary

The app now behaves like a coherent two-sided marketplace across the core actors:

- Customers can browse while logged out, open product details, review multiple images, add products to cart, sign in for protected flows, checkout, and track orders.
- Vendors can apply for a store, manage products after approval, upload product images, edit inventory and visibility, and prepare store orders.
- Admins can review stores, approve or suspend stores, manage products, manage orders, and assign delivery partners.
- Delivery partners are present through a separate delivery flow, partner lookup, assigned deliveries, live-location updates, and OTP-based completion.

The active technical path is React/Vite/TypeScript on the client with Supabase Auth, Postgres/RLS, Storage, RPCs, Realtime notifications, and Edge Functions. The legacy `server/` path remains in the repository, but the marketplace app currently relies on `client/src/lib/db/*`, `client/src/lib/storage.ts`, and Supabase migrations/schema for the live data model.

## What Works Now

- Logged-out users can browse public marketplace pages: home, product list, search, deals, stores, and store detail.
- Protected customer flows use `ProtectedRoute` for checkout, orders, order tracking, addresses, and saved items.
- Cart state is centralized in `client/src/context/CartContext.tsx`, persists locally, and enforces one store per cart.
- Checkout submits through the Supabase RPC `place_order`, which validates store/product/stock state and decrements stock server-side.
- Product cards and product detail modal support saved products through `FavoritesProvider`, `product_favorites`, and RLS.
- Product detail supports multiple images, thumbnails, carousel navigation, quantity controls, stock signals, store context, and accessible icon controls.
- Vendor store, product, and order flows are wired through `stores.ts`, `vendorProducts.ts`, and `vendorOrders.ts`.
- Admin store approval and order management are wired through admin pages and Supabase service helpers.
- In-app notifications exist through `notifications`, notification RPCs, `NotificationsDropdown`, and Supabase Realtime subscription.
- Store trust information now has stronger presentation where data exists: open/closed, estimated delivery, delivery fee, minimum order, and location.
- Empty, loading, and error states are present in key customer and saved-items flows.
- RLS policies cover profiles, addresses, stores, products, orders, delivery partners, notifications, and favorites.

## Files Reviewed

Primary changed app files reviewed:

- `client/src/App.tsx`
- `client/src/pages/AppLayout.tsx`
- `client/src/components/Navbar.tsx`
- `client/src/components/ProductCard.tsx`
- `client/src/components/ProductDetailModal.tsx`
- `client/src/components/NotificationsDropdown.tsx`
- `client/src/context/FavoritesContext.tsx`
- `client/src/context/favoritesContextValue.ts`
- `client/src/context/useFavorites.ts`
- `client/src/lib/db/favorites.ts`
- `client/src/lib/db/notifications.ts`
- `client/src/lib/db/orders.ts`
- `client/src/lib/db/vendorOrders.ts`
- `client/src/lib/db/stores.ts`
- `client/src/lib/db/deliveryPartners.ts`
- `client/src/pages/SavedItems.tsx`
- `client/src/pages/StoreDetail.tsx`
- `client/src/pages/admin/AdminLayout.tsx`
- `client/src/pages/vendor/VendorLayout.tsx`
- `client/src/pages/delivery/DeliveryLayout.tsx`
- `client/src/types/index.ts`
- `supabase/schema.sql`
- `supabase/migrations/20260610000000_notifications.sql`
- `supabase/migrations/20260610010000_product_favorites.sql`
- `docs/system-map.md`

## Files Changed In This Final Pass

- `client/src/pages/delivery/DeliveryLayout.tsx`
  - Added `type="button"` and `aria-label="Log out of delivery account"` to the icon-only delivery logout button.

- `docs/marketplace-qa-checklist.md`
  - Added this final integrated QA checklist and review document.

## Build And Test Results

- `npm.cmd run build` from `client/`: passed.
- Build warning: Vite reports the main JavaScript chunk is larger than 500 kB after minification. This is not a functional failure, but code splitting should be considered later.
- `npm.cmd run lint` from `client/`: failed.
- Lint failure summary: 148 problems, mostly broad existing `@typescript-eslint/no-explicit-any` violations and React compiler rules such as `react-hooks/set-state-in-effect`, plus a few component-specific issues. This is larger than a final-pass regression fix and should be handled as a separate lint hardening task.
- Automated unit tests: no test script is defined in `client/package.json`.

## Remaining Risks

- Route-level protection should be further audited for admin, vendor, and delivery areas. Layouts contain role/auth checks, and RLS is the backend source of truth, but route guard consistency should be tightened.
- Checkout totals are finalized by `place_order`; frontend totals should remain preview-only until a pricing preview RPC exists.
- Orders still store `items` and `status_history` as JSONB. This limits analytics, refunds, substitutions, review validation, and item-level reporting.
- Ratings and review counts exist on products, but a purchase-validated reviews table/workflow is not complete.
- Delivery partner is modeled outside the main `UserRole` enum, so delivery auth and partner linking need careful production QA.
- Storage policies are role-based; owner/path-scoped policies would be stronger for product/store image ownership.
- Notification RPCs are foundational, but duplicate/noisy notification behavior needs real order-flow QA.
- Lint health is not release-clean and should be addressed before treating CI as a quality gate.
- Mobile vendor/admin tables and dense operational screens need hands-on device testing.

## Manual QA Checklist

### Logged-Out Browsing

- Open `/` while logged out and confirm the home page loads.
- Open `/products` while logged out and confirm products render.
- Open `/stores` and `/stores/:id` while logged out and confirm public store information renders.
- Open `/deals` and `/search?q=test` while logged out and confirm pages do not require authentication.
- Confirm add-to-cart works for public products without forcing login.

### Signup/Login

- Create a new customer account from `/login`.
- Confirm a `profiles` row is created with role `CUSTOMER`.
- Log out and log back in.
- Attempt to open `/checkout` while logged out and confirm redirect to `/login`.
- After login, confirm protected customer pages can be opened.

### Customer Checkout

- Add an in-stock product to cart.
- Confirm the cart count updates in the navbar.
- Open cart sidebar and verify product name, price, quantity controls, subtotal, delivery fee, and checkout CTA.
- Move to checkout and verify address, payment, and review steps are readable on desktop and mobile.
- Submit an order and confirm `place_order` creates an `orders` row.
- Confirm product stock decreases after order placement.
- Confirm cart clears after successful checkout.
- Confirm the customer lands on or can open order tracking.

### Cart Behavior

- Increase and decrease item quantity.
- Remove an item.
- Add multiple products from the same store.
- Attempt to add a product from a different store and confirm the one-store cart rule is handled clearly.
- Refresh the browser and confirm cart persistence.
- Confirm empty cart state has a useful action back to browsing.

### Product Detail Modal

- Open a product detail modal from a product card.
- Confirm the modal has an accessible title and close button.
- Confirm Escape/click close behavior where implemented.
- Confirm quantity controls work and cannot exceed available stock.
- Confirm add-to-cart works from the modal.
- Confirm favorite/save toggle works from the modal for logged-in users.
- Confirm logged-out save attempts prompt login.

### Multiple Images

- Create or edit a product with multiple uploaded images.
- Confirm the product card uses the primary image.
- Confirm the product detail modal shows thumbnails.
- Confirm next/previous image controls work.
- Confirm mobile swipe or thumbnail selection works.
- Confirm image fallback renders if a product image is missing.

### Vendor Application

- Log in as a customer.
- Open `/vendor/apply`.
- Submit a store application with required store fields.
- Confirm the store is created with pending status.
- Confirm admin receives or can see a pending store.
- Confirm a pending/unapproved store cannot create public products.

### Vendor Product Creation

- Approve the vendor store as admin.
- Log in as the vendor.
- Open `/vendor/products/new`.
- Enter name, description, category, unit, price, stock, organic flag, and visibility.
- Upload multiple images.
- Save the product.
- Confirm the product appears in vendor product management.
- Confirm the product appears publicly only when the store is approved/open and the product is active/in stock.

### Vendor Product Editing

- Open an existing vendor product edit route.
- Update price, stock, description, active state, and images.
- Save and confirm the vendor product list reflects changes.
- Confirm public product and product detail views reflect the updated data.
- Confirm a vendor cannot edit another vendor's product through direct URL/RLS testing.

### Vendor Order Management

- Place a customer order for the vendor store.
- Open vendor orders.
- Confirm the new order appears with customer/order summary.
- Start preparing the order.
- Mark an item prepared.
- Mark an item unavailable and enter a reason.
- Complete preparation.
- Mark order ready for pickup.
- Confirm customer order tracking/status updates reflect vendor actions.

### Admin Store Approval

- Log in as admin.
- Open `/admin/stores`.
- Find a pending store.
- Approve the store.
- Confirm the vendor can access approved-store product operations.
- Suspend the store.
- Confirm public visibility/orderability is removed or restricted.
- Confirm the vendor sees a clear suspended state where implemented.

### Admin Order Management

- Open `/admin/orders`.
- View order detail modal.
- Change order status where supported.
- Assign an active delivery partner.
- Confirm customer receives status/delivery assignment notification.
- Confirm delivery partner sees the assigned order.
- Confirm admin cannot assign invalid/inactive partners if the UI or service guards this.

### Delivery Partner Flow

- Log in through `/delivery/login`.
- Confirm `/delivery` loads only for a linked delivery partner.
- Confirm assigned deliveries display.
- Open an assigned delivery.
- Update delivery location if supported by the UI.
- Complete delivery with the correct OTP.
- Try an incorrect OTP and confirm a readable error.
- Confirm delivered status is reflected for customer/admin/vendor where applicable.

### Saved Items And Notifications

- Log in as a customer.
- Save a product from a product card.
- Refresh and confirm saved state persists.
- Open `/saved` and confirm saved products appear.
- Unsave a product and confirm it disappears from saved items.
- Confirm a user cannot read another user's saved products through Supabase/RLS testing.
- Trigger an order or store event and confirm notification count updates.
- Open notifications dropdown.
- Mark one notification as read.
- Mark all notifications as read.

### Role-Based Access

- Logged-out user cannot open `/checkout`, `/orders`, `/orders/:id`, `/addresses`, or `/saved`.
- Customer cannot access another customer's orders by direct URL.
- Customer without vendor status is sent to vendor application before vendor dashboard access.
- Vendor cannot manage another vendor's store, products, or orders.
- Non-admin cannot access admin data through UI or direct Supabase queries.
- Delivery partner cannot read another partner's deliveries.
- Admin-only operations are blocked for non-admin users by RLS.

### Mobile Layout

- Test home on a narrow viewport.
- Test product grid at mobile width.
- Test product detail modal on mobile, including image controls and footer CTA.
- Test cart sidebar on mobile and confirm no horizontal overflow.
- Test checkout form on mobile with keyboard open.
- Test saved items grid on mobile.
- Test vendor product list and vendor order cards on mobile.
- Test admin store/order pages on mobile.
- Confirm tap targets are comfortable and icon-only buttons have accessible labels.

### Empty, Loading, And Error States

- Products: test no-results filter state.
- Stores: test empty store list if possible.
- Saved items: test no saved products.
- Cart: test empty cart.
- Orders: test no orders.
- Vendor products: test no products.
- Vendor orders: test no orders.
- Admin lists: test loading and empty states.
- Simulate a Supabase error and confirm message is readable and not only logged to console.

### RLS/Security Validation

- Query `product_favorites` as one user and confirm only that user's rows are visible.
- Query `notifications` as one user and confirm only that user's rows are visible.
- Attempt direct insert into `notifications` from a client user and confirm it is blocked.
- Attempt to update another user's notification `read_at` and confirm it is blocked.
- Attempt to create a product for an unowned store and confirm it is blocked.
- Attempt to create a product for an unapproved vendor store and confirm it is blocked.
- Attempt to read another customer's order and confirm it is blocked.
- Attempt to update an order as an unrelated customer/vendor and confirm it is blocked.
- Attempt to complete delivery as an unassigned partner and confirm it is blocked.
- Attempt to complete delivery with the wrong OTP and confirm it is blocked.

## Recommended Release Decision

The marketplace foundation is coherent enough for continued QA and controlled internal testing. Before production release, prioritize:

1. Manual RLS validation against a real Supabase project.
2. Mobile QA on customer checkout, vendor order preparation, and admin tables.
3. Lint hardening or adjusted lint policy so CI can provide a meaningful pass/fail signal.
4. A server-authoritative checkout preview total.
5. Purchase-validated reviews before enabling customer-written ratings.
