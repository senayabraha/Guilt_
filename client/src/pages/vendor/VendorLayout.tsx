import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Store as StoreIcon,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";

const VendorLayout = () => {
  const { t } = useTranslation();
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: "/vendor", label: t("vendor.dashboard"), icon: LayoutDashboard, end: true },
    { to: "/vendor/products", label: t("vendor.products"), icon: Package, end: false },
    { to: "/vendor/orders", label: t("vendor.orders"), icon: ShoppingBag, end: false },
    { to: "/vendor/store", label: t("vendor.store"), icon: StoreIcon, end: false },
  ];

  useEffect(() => {
    if (!loading && (!user || user.role !== "vendor")) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-app-cream flex">
      <aside className="w-60 bg-white border-r border-app-border flex flex-col fixed h-full">
        <div className="p-5 border-b border-app-border">
          <h1 className="text-lg font-bold text-app-green">{t("nav.vendorPanel")}</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-app-green text-white"
                    : "text-app-text-light hover:bg-app-cream"
                }`
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-app-border space-y-1">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-app-text-light hover:bg-app-cream w-full"
          >
            <ArrowLeft className="size-4" /> {t("nav.home")}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-app-error hover:bg-red-50 w-full"
          >
            <LogOut className="size-4" /> {t("nav.logout")}
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-60 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default VendorLayout;
