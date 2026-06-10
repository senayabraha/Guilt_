import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import AppLayout from "./pages/AppLayout";
import Home from "./pages/Home";
import Products from "./pages/Products";
import SearchResults from "./pages/SearchResults";
import FlashDeals from "./pages/FlashDeals";
import Stores from "./pages/Stores";
import StoreDetail from "./pages/StoreDetail";
import Checkout from "./pages/Checkout";
import MyOrders from "./pages/MyOrders";
import OrderTracking from "./pages/OrderTracking";
import Addresses from "./pages/Addresses";
import SavedItems from "./pages/SavedItems";
import ProtectedRoute from "./components/ProtectedRoute";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminDeliveryPartners from "./pages/admin/AdminDeliveryPartners";
import AdminStores from "./pages/admin/AdminStores";
import AdminStoreDetail from "./pages/admin/AdminStoreDetail";

import VendorLayout from "./pages/vendor/VendorLayout";
import VendorStores from "./pages/vendor/VendorStores";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorProducts from "./pages/vendor/VendorProducts";
import VendorProductForm from "./pages/vendor/VendorProductForm";
import VendorOrders from "./pages/vendor/VendorOrders";
import VendorOrderPrepare from "./pages/vendor/VendorOrderPrepare";
import VendorSettings from "./pages/vendor/VendorSettings";
import VendorApply from "./pages/vendor/VendorApply";

import DeliveryLogin from "./pages/delivery/DeliveryLogin";
import DeliveryLayout from "./pages/delivery/DeliveryLayout";
import DeliveryDashboard from "./pages/delivery/DeliveryDashboard";

const App = () => {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1B3022",
            color: "#fff",
            borderRadius: "12px",
            fontSize: "14px",
          },
        }}
      />

      <Routes>
        {/* Auth pages - No Navbar/Footer */}
        <Route path="/login" element={<Login />} />

        {/* Main pages - With Navbar/Footer */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<Products />} />
          <Route path="search" element={<SearchResults />} />
          <Route path="deals" element={<FlashDeals />} />
          <Route path="stores" element={<Stores />} />
          <Route path="stores/:id" element={<StoreDetail />} />
          <Route element={<ProtectedRoute />}>
            <Route path="checkout" element={<Checkout />} />
            <Route path="orders" element={<MyOrders />} />
            <Route path="orders/:id" element={<OrderTracking />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="saved" element={<SavedItems />} />
          </Route>
        </Route>

        {/* Admin pages */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="products/:id/edit" element={<AdminProductForm />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="delivery-partners" element={<AdminDeliveryPartners />} />
          <Route path="stores" element={<AdminStores />} />
          <Route path="stores/:id" element={<AdminStoreDetail />} />
        </Route>

        {/* Vendor pages */}
        {/* /vendor/apply is protected — logged-out users are sent to /login */}
        <Route element={<ProtectedRoute />}>
          <Route path="/vendor/apply" element={<VendorApply />} />
        </Route>
        <Route path="/vendor" element={<VendorLayout />}>
          {/* Landing: list of all stores the vendor owns */}
          <Route index element={<VendorStores />} />
          {/* Products span all the vendor's stores */}
          <Route path="products" element={<VendorProducts />} />
          <Route path="products/new" element={<VendorProductForm />} />
          <Route path="products/:id/edit" element={<VendorProductForm />} />
          {/* Store-scoped dashboard, orders and settings */}
          <Route path="stores/:storeId" element={<VendorDashboard />} />
          <Route path="stores/:storeId/orders" element={<VendorOrders />} />
          <Route path="orders/:orderId/prepare" element={<VendorOrderPrepare />} />
          <Route path="stores/:storeId/settings" element={<VendorSettings />} />
          {/* Legacy routes: send the vendor to pick a store first */}
          <Route path="orders" element={<Navigate to="/vendor" replace />} />
          <Route path="settings" element={<Navigate to="/vendor" replace />} />
        </Route>

        {/* Delivery Partner pages */}
        <Route path="/delivery/login" element={<DeliveryLogin />} />
        <Route path="/delivery" element={<DeliveryLayout />}>
          <Route index element={<DeliveryDashboard />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
