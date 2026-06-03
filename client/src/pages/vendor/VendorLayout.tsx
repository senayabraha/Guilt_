import { Navigate, NavLink, Outlet } from "react-router-dom";
import {
  BarChart3Icon,
  PlusIcon,
  PackageSearchIcon,
  ShoppingBagIcon,
  SettingsIcon,
  StoreIcon,
  LogOutIcon,
} from "lucide-react";

import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";

export default function VendorLayout() {
  const { user, loading } = useAuth();

  const VendorLinkData = [
    { to: "/vendor", label: "Dashboard", icon: BarChart3Icon },
    { to: "/vendor/products/new", label: "Add Product", icon: PlusIcon },
    { to: "/vendor/products", label: "Products", icon: PackageSearchIcon },
    { to: "/vendor/orders", label: "Orders", icon: ShoppingBagIcon },
    { to: "/vendor/settings", label: "Store Settings", icon: SettingsIcon },
    { to: "/", label: "Exit", icon: LogOutIcon },
  ];

  if (loading) {
    return <></>;
  }

  // Any logged-in user can reach the vendor area (customers can apply to become a vendor).
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="h-screen overflow-hidden">
      <div className="max-lg:hidden">
        <Navbar />
      </div>
      <div className="flex flex-col h-full lg:flex-row gap-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Vendor Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 h-fit bg-white rounded-2xl p-4 border border-app-border">
          <div className="pb-4 mb-4 border-b border-app-border">
            <h2 className="text-lg font-semibold text-app-green flex items-center gap-2 px-2">
              <StoreIcon className="size-5 text-green-900" /> Vendor Panel
            </h2>
          </div>
          <nav className="flex flex-col gap-1.5">
            {VendorLinkData.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/vendor"}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-2.5 rounded-md text-sm transition-colors ${isActive ? "bg-app-green text-white" : "text-app-text-light hover:bg-orange-50 hover:text-zinc-900"}`
                }
              >
                <link.icon className="size-4" /> {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto no-scrollbar pb-20">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
