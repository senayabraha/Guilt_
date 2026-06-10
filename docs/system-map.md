# Guilt Marketplace System Map

## Executive Summary

Guilt is a multi-role marketplace application built with React, Vite, TypeScript, Tailwind CSS, and Supabase. The active client path talks directly to Supabase for authentication, database reads/writes, storage, RPCs, and Edge Functions. A legacy Express/Prisma server remains in `server/`, but the current marketplace flows are primarily implemented in `client/src` and `supabase/`.

The application supports customer shopping, vendor/store management, admin operations, and delivery partner fulfillment. Core business rules live in a mix of Supabase RLS policies, RPC functions, frontend database service modules, and role-specific pages. Orders are stored with JSONB line items and status history, while stores, products, addresses, delivery partners, notifications, and favorites use first-class tables.

This document maps the current architecture and highlights inspection areas that matter for security, scale, product quality, and future marketplace trust features.

## Repository Folder Structure

```text
client/
  package.json
  src/
    main.tsx
    App.tsx
    components/
    context/
    hooks/
    lib/
      db/
      supabase.ts
      storage.ts
    pages/
    types/
server/
  prisma/
  src/
supabase/
  functions/
  migrations/
  schema.sql
docs/
  marketplace-understanding.md
  system-map.md
```

Important folders:

- `client/src/pages/`: route-level screens for customer, vendor, admin, and delivery flows.
- `client/src/components/`: reusable UI and workflow components such as product cards, cart sidebar, image uploaders, maps, order tracking, and vendor order modals.
- `client/src/context/`: shared app state for auth, cart, and saved products.
- `client/src/lib/db/`: Supabase data access modules grouped by domain.
- `client/src/lib/supabase.ts`: Supabase browser client initialization.
- `client/src/lib/storage.ts`: Supabase Storage upload helpers.
- `supabase/schema.sql`: consolidated schema, functions, triggers, RLS policies, and storage configuration.
- `supabase/migrations/`: chronological database migrations.
- `supabase/functions/`: Supabase Edge Functions for payments and admin delivery partner creation.
- `server/`: legacy Express/Prisma backend path that is not the primary frontend integration path.

## Framework And Stack

- Frontend: React 19, Vite 8, TypeScript, React Router 7.
- Styling: Tailwind CSS v4 with app-level styles in `client/src/index.css`.
- Icons/UI helpers: `lucide-react`, `react-hot-toast`.
- Maps/location: Leaflet and `react-leaflet`.
- Backend: Supabase Auth, Postgres, RLS, Storage, RPC functions, Edge Functions.
- Payments: Stripe-oriented Edge Functions in `supabase/functions/create-checkout-session` and `supabase/functions/stripe-webhook`.
- Legacy backend: Express/Prisma under `server/`.

## App Entry Points

- `client/src/main.tsx`
  - Wraps the app with `BrowserRouter`, `AuthProvider`, and `CartProvider`.
  - Renders `App`.

- `client/src/App.tsx`
  - Defines all React Router routes.
  - Configures `Toaster` from `react-hot-toast`.
  - Separates public/customer routes, admin routes, vendor routes, and delivery routes.

- `client/src/pages/AppLayout.tsx`
  - Customer-facing layout shell.
  - Renders `Banner`, `Navbar`, `Outlet`, `Footer`, and `CartSidebar`.
  - Wraps the customer shell in `FavoritesProvider`.

- `client/src/lib/supabase.ts`
  - Creates the Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
  - Normalizes the configured Supabase URL before client creation.

## Layout Structure

- Customer layout: `client/src/pages/AppLayout.tsx`
  - Used for home, products, store browsing, checkout, orders, addresses, and saved items.
  - Global navigation and cart sidebar live here.

- Admin layout: `client/src/pages/admin/AdminLayout.tsx`
  - Shell for admin dashboard, products, orders, delivery partners, and stores.

- Vendor layout: `client/src/pages/vendor/VendorLayout.tsx`
  - Shell for vendor stores, products, orders, preparation workflow, and settings.

- Delivery layout: `client/src/pages/delivery/DeliveryLayout.tsx`
  - Shell for delivery partner dashboard and assigned deliveries.

Key shared layout/navigation components:

- `client/src/components/Navbar.tsx`
- `client/src/components/Banner.tsx`
- `client/src/components/Footer.tsx`
- `client/src/components/CartSidebar.tsx`
- `client/src/components/NotificationsDropdown.tsx`

## Role Map

Application roles are defined in `client/src/types/index.ts`:

- `CUSTOMER`
  - Can browse products/stores, manage cart, checkout, view orders, manage addresses, and save products.

- `VENDOR`
  - Can apply for and manage stores, products, vendor orders, preparation status, and store settings.

- `ADMIN`
  - Can manage stores, products, orders, and delivery partners.

Delivery partner users are modeled separately from `UserRole`:

- `delivery_partners.auth_user_id` links a delivery partner record to a Supabase auth user.
- Delivery access is enforced through delivery partner queries, RLS helper functions, and assigned order checks.

Important auth/profile files:

- `client/src/context/AuthContext.tsx`
- `client/src/components/ProtectedRoute.tsx`
- `client/src/lib/db/profiles.ts`
- `supabase/schema.sql`

## Screen Map

Customer-facing screens:

- `client/src/pages/Home.tsx`
- `client/src/pages/Products.tsx`
- `client/src/pages/Search.tsx`
- `client/src/pages/Deals.tsx`
- `client/src/pages/Stores.tsx`
- `client/src/pages/StoreDetail.tsx`
- `client/src/pages/Checkout.tsx`
- `client/src/pages/Orders.tsx`
- `client/src/pages/OrderTracking.tsx`
- `client/src/pages/Addresses.tsx`
- `client/src/pages/SavedItems.tsx`
- `client/src/pages/Login.tsx`

Vendor/store-facing screens:

- `client/src/pages/vendor/VendorApply.tsx`
- `client/src/pages/vendor/VendorStores.tsx`
- `client/src/pages/vendor/VendorProducts.tsx`
- `client/src/pages/vendor/VendorProductForm.tsx`
- `client/src/pages/vendor/VendorStoreDashboard.tsx`
- `client/src/pages/vendor/VendorOrders.tsx`
- `client/src/pages/vendor/VendorOrderPrepare.tsx`
- `client/src/pages/vendor/VendorSettings.tsx`

Admin screens:

- `client/src/pages/admin/AdminDashboard.tsx`
- `client/src/pages/admin/AdminProducts.tsx`
- `client/src/pages/admin/AdminProductForm.tsx`
- `client/src/pages/admin/AdminOrders.tsx`
- `client/src/pages/admin/AdminDeliveryPartners.tsx`
- `client/src/pages/admin/AdminStores.tsx`
- `client/src/pages/admin/AdminStoreDetail.tsx`

Delivery partner screens:

- `client/src/pages/delivery/DeliveryLogin.tsx`
- `client/src/pages/delivery/DeliveryDashboard.tsx`

## Route Map

Routes are defined in `client/src/App.tsx`.

Public/auth routes:

- `/login` -> `Login`
- `/delivery/login` -> `DeliveryLogin`

Customer shell routes under `AppLayout`:

- `/` -> `Home`
- `/products` -> `Products`
- `/products/:id` -> `Products`
- `/search` -> `Search`
- `/deals` -> `Deals`
- `/stores` -> `Stores`
- `/stores/:id` -> `StoreDetail`
- `/checkout` -> `ProtectedRoute` + `Checkout`
- `/orders` -> `ProtectedRoute` + `Orders`
- `/orders/:id` -> `ProtectedRoute` + `OrderTracking`
- `/addresses` -> `ProtectedRoute` + `Addresses`
- `/saved` -> `ProtectedRoute` + `SavedItems`

Admin routes under `AdminLayout`:

- `/admin` -> `AdminDashboard`
- `/admin/products` -> `AdminProducts`
- `/admin/products/new` -> `AdminProductForm`
- `/admin/products/:id/edit` -> `AdminProductForm`
- `/admin/orders` -> `AdminOrders`
- `/admin/delivery-partners` -> `AdminDeliveryPartners`
- `/admin/stores` -> `AdminStores`
- `/admin/stores/:id` -> `AdminStoreDetail`

Vendor routes:

- `/vendor/apply` -> `ProtectedRoute` + `VendorApply`
- `/vendor` -> `ProtectedRoute` + `VendorLayout`
- `/vendor` index -> `VendorStores`
- `/vendor/products` -> `VendorProducts`
- `/vendor/products/new` -> `VendorProductForm`
- `/vendor/products/:id/edit` -> `VendorProductForm`
- `/vendor/stores/:storeId` -> `VendorStoreDashboard`
- `/vendor/stores/:storeId/orders` -> `VendorOrders`
- `/vendor/orders/:orderId/prepare` -> `VendorOrderPrepare`
- `/vendor/stores/:storeId/settings` -> `VendorSettings`
- `/vendor/orders` -> redirects to `/vendor`
- `/vendor/settings` -> redirects to `/vendor`

Delivery routes:

- `/delivery` -> `ProtectedRoute` + `DeliveryLayout`
- `/delivery` index -> `DeliveryDashboard`

## Data Model Map

Primary tables in `supabase/schema.sql`:

- `profiles`
  - Important fields: `id`, `name`, `email`, `phone`, `avatar`, `role`, `created_at`, `updated_at`.
  - `role` uses `user_role` enum: `CUSTOMER`, `VENDOR`, `ADMIN`.

- `addresses`
  - Important fields: `id`, `user_id`, `label`, `address`, `city`, `state`, `zip`, `is_default`, `lat`, `lng`.

- `stores`
  - Important fields: `id`, `owner_id`, `name`, `description`, `phone`, `email`, `logo`, `cover_image`, `address`, `city`, `state`, `zip`, `lat`, `lng`, `categories`, `status`, `is_open`, `delivery_radius`, `delivery_fee`, `min_order`, `commission_rate`.
  - `status` uses `store_status` enum: `PENDING`, `APPROVED`, `SUSPENDED`.

- `products`
  - Important fields: `id`, `store_id`, `name`, `description`, `images`, `specifications`, `price`, `original_price`, `image`, `category`, `unit`, `stock`, `is_organic`, `is_active`, `rating`, `review_count`.
  - `images` is JSONB for multi-image support.
  - `image` is the primary display image.

- `orders`
  - Important fields: `id`, `user_id`, `store_id`, `items`, `shipping_address`, `payment_method`, `subtotal`, `delivery_fee`, `tax`, `total`, `status`, `status_history`, `delivery_partner_id`, `delivery_otp`, `live_location`, `is_paid`, `stripe_session_id`.
  - `items`, `shipping_address`, `status_history`, and `live_location` are JSONB.

- `delivery_partners`
  - Important fields: `id`, `auth_user_id`, `name`, `email`, `phone`, `avatar`, `vehicle_type`, `is_active`, `created_at`, `updated_at`.

- `notifications`
  - Important fields: `id`, `user_id`, `audience`, `type`, `title`, `message`, `entity_type`, `entity_id`, `read_at`, `created_at`.

- `product_favorites`
  - Important fields: `user_id`, `product_id`, `created_at`.
  - Composite primary key: `user_id`, `product_id`.

Views:

- `visible_products`
  - Public-safe view for active, in-stock products from approved and open stores.

Key RPCs/functions:

- `handle_new_user()`
  - Creates a `profiles` row for a new Supabase auth user.

- `prevent_role_escalation()`
  - Guards profile role changes.

- `set_updated_at()`
  - Trigger helper for `updated_at`.

- `is_admin(user_uuid)`
  - RLS helper.

- `is_vendor_for_store(store_uuid, user_uuid)`
  - RLS helper.

- `is_assigned_partner(order_uuid, user_uuid)`
  - RLS helper.

- `can_view_partner(partner_uuid, user_uuid)`
  - RLS helper.

- `place_order(cart jsonb, shipping jsonb)`
  - Validates cart/store/product state, creates an order, decrements stock, and returns order id.

- `complete_delivery(order_uuid uuid, otp_input text)`
  - Validates delivery partner assignment and OTP, then completes the order.

- `insert_notification(...)`
  - Private notification insert helper.

- `notify_order_placed(...)`
- `notify_order_status_changed(...)`
- `notify_delivery_assigned(...)`
- `notify_store_pending(...)`
- `notify_store_status_changed(...)`
  - Notification helper functions for marketplace events.

Migrations:

- `supabase/migrations/20260101000000_initial_schema.sql`
- `supabase/migrations/20260201000000_storage_setup.sql`
- `supabase/migrations/20260301000000_product_and_rls.sql`
- `supabase/migrations/20260608000000_security_and_perf.sql`
- `supabase/migrations/20260610000000_notifications.sql`
- `supabase/migrations/20260610010000_product_favorites.sql`

Additional consolidated migration files:

- `supabase/migration_security_and_perf.sql`
- `supabase/migrations_product_and_rls.sql`

## Service/API Map

Supabase client:

- `client/src/lib/supabase.ts`

Product services:

- `client/src/lib/db/products.ts`
  - `getPublicProducts`
  - `getFlashDeals`
  - `getProduct`
  - `getAllProducts`
  - `createProduct`
  - `updateProduct`
  - `deactivateProduct`
  - `getStoreProducts`

- `client/src/lib/db/vendorProducts.ts`
  - Vendor-specific product helpers for store-scoped product management.

Store services:

- `client/src/lib/db/stores.ts`
  - `getPublicStores`
  - `getPublicStore`
  - `getPublicStoreProducts`
  - `getMyStore`
  - `getMyStores`
  - `getMyStoreById`
  - `applyForStore`
  - `updateMyStore`
  - `getAllStores`
  - `getAdminStore`
  - `setStoreStatus`
  - `updateAdminStore`

Order services:

- `client/src/lib/db/orders.ts`
  - `placeOrder`
  - `getMyOrders`
  - `getOrder`
  - `getOrderLocation`
  - `getStoreOrders`
  - `getAllOrders`
  - `updateOrderStatus`
  - `assignDeliveryPartner`

- `client/src/lib/db/vendorOrders.ts`
  - `getVendorOrder`
  - `startPreparingOrder`
  - `updateOrderItemPrepStatus`
  - `completeOrderPreparation`
  - `confirmReadyForPickup`

Delivery services:

- `client/src/lib/db/deliveryPartners.ts`
  - `getMyPartner`
  - `getMyDeliveries`
  - `getDeliveryDetail`
  - `updateDeliveryLocation`
  - `completeDelivery`
  - `getAllPartners`
  - `updatePartner`
  - `createPartner`

Profile/address/favorites/notifications:

- `client/src/lib/db/profiles.ts`
- `client/src/lib/db/addresses.ts`
- `client/src/lib/db/favorites.ts`
- `client/src/lib/db/notifications.ts`

Mappers:

- `client/src/lib/db/mappers.ts`
  - Converts database rows into frontend-facing types.

Storage:

- `client/src/lib/storage.ts`
  - `uploadProductImage`
  - `uploadStoreImage`
  - `uploadAvatar`

Supabase Edge Functions:

- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/admin-create-delivery-partner/index.ts`
- `supabase/functions/_shared/cors.ts`

## Key Components, Hooks, And Contexts

Shared components:

- `client/src/components/ProductCard.tsx`
- `client/src/components/ProductDetailModal.tsx`
- `client/src/components/ProductQuickView.tsx`
- `client/src/components/FilterPanel.tsx`
- `client/src/components/CartSidebar.tsx`
- `client/src/components/Navbar.tsx`
- `client/src/components/NotificationsDropdown.tsx`
- `client/src/components/StoreCard.tsx`
- `client/src/components/StatusState.tsx`
- `client/src/components/Loading.tsx`

Home/customer components:

- `client/src/components/Hero.tsx`
- `client/src/components/HomeSearch.tsx`
- `client/src/components/HomeCategories.tsx`
- `client/src/components/FeaturedStores.tsx`
- `client/src/components/MarketplaceCTAs.tsx`
- `client/src/components/Newsletter.tsx`
- `client/src/components/QuickTabs.tsx`

Checkout components:

- `client/src/components/CheckoutAddress.tsx`
- `client/src/components/CheckoutPayment.tsx`
- `client/src/components/CheckoutReview.tsx`

Order tracking components:

- `client/src/components/LiveMap.tsx`
- `client/src/components/OrderOTP.tsx`
- `client/src/components/OrderTimeLine.tsx`

Delivery components:

- `client/src/components/DeliveryOrderCard.tsx`
- `client/src/components/OtpModal.tsx`
- `client/src/components/CancelModal.tsx`

Vendor components:

- `client/src/components/VendorOrderDetailModal.tsx`

Image/location components:

- `client/src/components/MultiImageUpload.tsx`
- `client/src/components/ImageCropUpload.tsx`
- `client/src/components/LocationSelector.tsx`
- `client/src/components/MapPinPicker.tsx`

Contexts:

- `client/src/context/AuthContext.tsx`
- `client/src/context/CartContext.tsx`
- `client/src/context/FavoritesContext.tsx`
- `client/src/context/favoritesContextValue.ts`
- `client/src/context/useFavorites.ts`

## Auth/RLS Map

Frontend auth:

- `AuthContext` calls `supabase.auth.getSession()` on startup.
- It subscribes to `supabase.auth.onAuthStateChange()`.
- It exposes `login`, `register`, `logout`, `refreshProfile`, and profile state.
- `ProtectedRoute` waits for auth loading and redirects anonymous users to `/login`, preserving `location` in navigation state.

Profile creation:

- Supabase trigger `handle_new_user()` creates a `profiles` row after auth signup.
- New users default to `CUSTOMER`.

Role change guard:

- `prevent_role_escalation()` prevents unsafe role updates.
- A customer can become a vendor through the intended vendor application path.
- Admin role assignment must remain admin-controlled.

RLS policy summary:

- `profiles`
  - Users can read/update their own profile.
  - Admin users can read/manage profiles.
  - Role escalation is guarded by trigger logic.

- `addresses`
  - Users can manage their own addresses.
  - Admins can view/manage addresses.

- `stores`
  - Public users can read approved/open stores.
  - Owners can read/update their stores.
  - Admins can manage stores.

- `products`
  - Public users can read active/in-stock products from approved/open stores.
  - Vendors can manage products for stores they own.
  - Admins can manage products.

- `orders`
  - Customers can read their own orders.
  - Store owners can read/update orders for their stores.
  - Admins can read/update orders.
  - Assigned delivery partners can read/update delivery-relevant order data.
  - Direct client inserts are restricted; order creation goes through `place_order`.

- `delivery_partners`
  - Admins can manage partners.
  - A linked delivery partner can access their own partner record.
  - Partner visibility helpers restrict cross-partner access.

- `notifications`
  - Users can read and mark their own notifications.
  - Direct public insertion is restricted.

- `product_favorites`
  - Users can read, insert, and delete only their own saved products.

Storage/RLS:

- Buckets: `product-images`, `store-images`, `avatars`.
- Product/store image uploads are intended for vendors/admins.
- Avatars are intended for authenticated users.
- Public read is enabled for marketplace images.

## Product Image Flow

Product images:

1. Vendor/admin opens a product form such as `VendorProductForm` or `AdminProductForm`.
2. The form uses `MultiImageUpload`.
3. Uploads call `uploadProductImage` in `client/src/lib/storage.ts`.
4. Files are stored in the `product-images` bucket using random UUID-based paths.
5. Product records store all images in `products.images`.
6. The primary display image is stored in `products.image`, usually the first image.
7. Public product views read public Supabase Storage URLs.

Store images:

1. Store settings or store application UI uses `ImageCropUpload`.
2. Uploads call `uploadStoreImage`.
3. Files are stored in the `store-images` bucket.
4. Store records use `stores.logo` and `stores.cover_image`.

Avatar images:

1. Profile/delivery/admin flows can call `uploadAvatar`.
2. Files are stored in the `avatars` bucket.

## Cart And Checkout Flow

Cart state:

- `client/src/context/CartContext.tsx` owns cart state.
- Local storage key: `app_cart`.
- The cart enforces a one-store-at-a-time checkout model.
- Derived values include cart count, subtotal, and active store id.

Cart UI:

- `client/src/components/CartSidebar.tsx` shows cart contents and checkout entry.
- `Navbar` exposes the cart trigger.

Checkout:

- `client/src/pages/Checkout.tsx` uses a multi-step flow:
  - Address step through `CheckoutAddress`.
  - Payment step through `CheckoutPayment`.
  - Review step through `CheckoutReview`.
- Saved addresses come from `client/src/lib/db/addresses.ts`.
- Order submission calls `placeOrder` from `client/src/lib/db/orders.ts`.

Database order placement:

- `placeOrder` calls the Supabase RPC `place_order(cart, shipping)`.
- The RPC validates:
  - Authenticated customer.
  - Non-empty cart.
  - One-store order.
  - Store is approved and open.
  - Products are active and have enough stock.
- The RPC calculates subtotal, delivery fee, tax, and total.
- The RPC inserts the order and decrements product stock.
- On success, the frontend clears the cart and navigates to order tracking.

## Order Lifecycle

Core order fields:

- `orders.status`
- `orders.status_history`
- `orders.items`
- `orders.delivery_partner_id`
- `orders.delivery_otp`
- `orders.live_location`

Typical lifecycle:

1. Customer submits checkout.
2. `place_order` creates the order with initial status such as placed/pending.
3. Vendor receives and prepares the order.
4. Vendor can move order into preparing states.
5. Vendor can mark items unavailable or partially available.
6. Vendor marks order ready for pickup.
7. Admin assigns a delivery partner using `assignDeliveryPartner`.
8. Delivery partner sees assigned delivery.
9. Delivery partner updates live location.
10. Delivery partner completes delivery through `complete_delivery(order_uuid, otp_input)`.
11. `status_history` records important status events.

Important frontend files:

- `client/src/pages/Orders.tsx`
- `client/src/pages/OrderTracking.tsx`
- `client/src/components/OrderTimeLine.tsx`
- `client/src/components/LiveMap.tsx`
- `client/src/components/OrderOTP.tsx`
- `client/src/lib/db/orders.ts`

## Vendor Product/Order Lifecycle

Vendor onboarding:

1. Authenticated customer visits `/vendor/apply`.
2. `VendorApply` submits store information through `applyForStore`.
3. The store is created with a pending status.
4. Admin reviews the store in `AdminStores` or `AdminStoreDetail`.
5. Admin updates store status through `setStoreStatus`.
6. Approved vendors can manage products and receive orders.

Product lifecycle:

1. Vendor opens `/vendor/products/new` or `/vendor/products/:id/edit`.
2. `VendorProductForm` collects product details and images.
3. Images upload through `MultiImageUpload` and `uploadProductImage`.
4. Product data is saved through vendor/product service helpers.
5. Public listing depends on store approval/open status plus product active/stock state.

Vendor order lifecycle:

1. Vendor views store orders in `/vendor/stores/:storeId/orders`.
2. `VendorOrders` loads store-scoped orders.
3. Vendor opens preparation workflow at `/vendor/orders/:orderId/prepare`.
4. `VendorOrderPrepare` uses `vendorOrders.ts` helpers:
   - `startPreparingOrder`
   - `updateOrderItemPrepStatus`
   - `completeOrderPreparation`
   - `confirmReadyForPickup`
5. Item-level preparation state is stored inside `orders.items`.
6. Order-level changes update `orders.status` and `orders.status_history`.

## Customer Journey Map

1. User lands on `/`.
2. Home modules highlight search, categories, featured stores, and marketplace calls to action.
3. User browses `/products`, `/search`, `/deals`, `/stores`, or `/stores/:id`.
4. Product cards and product detail modals support add-to-cart and saved product actions.
5. Cart is managed in `CartSidebar`.
6. Checkout requires login through `ProtectedRoute`.
7. Checkout captures address, payment choice, and review.
8. `place_order` creates the order and decrements stock.
9. Customer views order list at `/orders`.
10. Customer tracks a specific order at `/orders/:id`.
11. Customer can manage addresses at `/addresses`.
12. Customer can view saved products at `/saved`.

## Vendor Journey Map

1. User signs in as a customer.
2. User applies for a vendor store at `/vendor/apply`.
3. Admin approves the store.
4. Vendor accesses `/vendor`.
5. Vendor reviews stores in `VendorStores`.
6. Vendor manages products from `/vendor/products`.
7. Vendor creates/edits products through `VendorProductForm`.
8. Vendor monitors store dashboard at `/vendor/stores/:storeId`.
9. Vendor handles orders at `/vendor/stores/:storeId/orders`.
10. Vendor prepares an order at `/vendor/orders/:orderId/prepare`.
11. Vendor updates store settings at `/vendor/stores/:storeId/settings`.

## Admin Operations Map

Admin product operations:

- `/admin/products`
- `/admin/products/new`
- `/admin/products/:id/edit`
- Services: `getAllProducts`, `createProduct`, `updateProduct`, `deactivateProduct`.

Admin order operations:

- `/admin/orders`
- Services: `getAllOrders`, `updateOrderStatus`, `assignDeliveryPartner`.

Admin delivery partner operations:

- `/admin/delivery-partners`
- Services: `getAllPartners`, `createPartner`, `updatePartner`.
- Edge Function: `supabase/functions/admin-create-delivery-partner/index.ts`.

Admin store operations:

- `/admin/stores`
- `/admin/stores/:id`
- Services: `getAllStores`, `getAdminStore`, `setStoreStatus`, `updateAdminStore`.

Admin dashboard:

- `/admin`
- Screen: `client/src/pages/admin/AdminDashboard.tsx`.

## Delivery Partner Map

Delivery partner login:

- `/delivery/login`
- Screen: `client/src/pages/delivery/DeliveryLogin.tsx`.

Delivery dashboard:

- `/delivery`
- Screen: `client/src/pages/delivery/DeliveryDashboard.tsx`.

Delivery services:

- `getMyPartner`
- `getMyDeliveries`
- `getDeliveryDetail`
- `updateDeliveryLocation`
- `completeDelivery`

Delivery database behavior:

- Delivery partners are records in `delivery_partners`.
- An auth user is linked through `delivery_partners.auth_user_id`.
- Assigned orders reference `orders.delivery_partner_id`.
- `complete_delivery` validates assignment and OTP before setting delivered state.

## Notification Map

Notification data:

- Table: `notifications`.
- Service: `client/src/lib/db/notifications.ts`.
- UI: `client/src/components/NotificationsDropdown.tsx`.

Notification model:

- `id`
- `user_id`
- `audience`
- `type`
- `title`
- `message`
- `entity_type`
- `entity_id`
- `read_at`
- `created_at`

Important event helpers:

- `notify_order_placed`
- `notify_order_status_changed`
- `notify_delivery_assigned`
- `notify_store_pending`
- `notify_store_status_changed`

Current intent:

- Keep notifications in-app only.
- Avoid push notifications unless explicitly added later.
- Users can only read/update their own notification rows.

## Trust Feature Map

Saved products:

- Table: `product_favorites`.
- Service: `client/src/lib/db/favorites.ts`.
- Context: `FavoritesContext`.
- Hook: `useFavorites`.
- UI locations: `ProductCard`, `ProductDetailModal`, `SavedItems`.

Ratings/reviews:

- `products.rating` and `products.review_count` exist.
- A full review table and purchase-validated review workflow should be added before accepting user-generated reviews.
- Reviews should require a purchased product/order item and should prevent duplicate reviews for the same customer/product/order item combination.

Store trust display:

- Existing store fields support partial trust display:
  - `stores.status`
  - `stores.is_open`
  - `stores.delivery_fee`
  - `stores.min_order`
  - `stores.address`, `city`, `state`, `zip`
  - `stores.logo`, `cover_image`
  - `stores.categories`

## Known Risks

- The legacy Express/Prisma server remains in `server/` while the client primarily uses Supabase directly. This creates a risk of duplicated business logic or stale backend assumptions.
- Delivery partner access is modeled outside the `UserRole` enum. This can work, but route guards, RLS helpers, and UI assumptions need regular review.
- Orders store `items` and `status_history` as JSONB. This is fast for MVP iteration but limits analytics, refunds, substitutions, review validation, and item-level lifecycle reporting.
- Admin and vendor route protection should be audited carefully. Some protection happens at the route level, but RLS is the final source of truth.
- Product ratings and review counts exist without a fully purchase-validated review system.
- Product/store image storage uses random UUID paths and role-based policies. Owner/path-scoped storage rules would be stronger.
- Checkout totals are finalized by `place_order`, but any frontend estimate must be treated as preview-only.
- Notification and favorites migrations must be applied in the target Supabase environment before those features are relied on.
- Full lint/build health should be monitored because broader repo linting may contain existing issues unrelated to current feature work.
- Store approval, product visibility, and order creation rules depend on both frontend checks and RLS/RPC logic; RLS/RPC must remain authoritative.

## Recommended Next Inspection Areas

- Audit route-level role guards for admin, vendor, and delivery screens.
- Add Supabase policy tests for profiles, stores, products, orders, delivery partners, notifications, and product favorites.
- Normalize order items, status events, unavailable items, refunds, and substitutions when marketplace operations become more complex.
- Add a purchase-validated reviews table and aggregation workflow.
- Add a pricing preview RPC so checkout review can show server-authoritative totals before final submission.
- Strengthen storage policies with owner-scoped paths where practical.
- Review delivery partner auth and assignment flows end to end.
- Review notification volume rules to avoid noisy or duplicate notifications.
- Continue mobile QA on admin/vendor tables and dense operational screens.
- Decide whether to remove, revive, or clearly mark the legacy `server/` backend as deprecated.
