import { Navigate, NavLink, Outlet, Link } from "react-router-dom";
import {
  PackageSearchIcon,
  ShoppingBagIcon,
  BarChart3Icon,
  ShieldIcon,
  TruckIcon,
  StoreIcon,
  LogOutIcon,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: BarChart3Icon, end: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBagIcon, end: false },
  { to: "/admin/stores", label: "Stores", icon: StoreIcon, end: false },
  { to: "/admin/delivery-partners", label: "Partners", icon: TruckIcon, end: false },
  { to: "/admin/products", label: "Products", icon: PackageSearchIcon, end: false },
];

export default function AdminLayout() {
  const { user, loading } = useAuth();
  if (loading) return <></>;
  if (!user?.isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* ── Desktop: fixed left sidebar ─────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 fixed inset-y-0 left-0 bg-white border-r border-app-border z-30">
        <div className="px-5 py-5 border-b border-app-border flex items-center gap-2.5">
          <ShieldIcon className="size-5 text-app-green shrink-0" />
          <span className="text-base font-semibold text-app-green">Admin Panel</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-app-green text-white"
                    : "text-app-text-light hover:bg-orange-50 hover:text-zinc-900"
                }`
              }
            >
              <item.icon className="size-4 shrink-0" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-app-border">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-app-text-light hover:bg-orange-50 hover:text-zinc-900 transition-colors"
          >
            <LogOutIcon className="size-4 shrink-0" /> Exit Admin
          </Link>
        </div>
      </aside>

      {/* ── Desktop: content area offset by sidebar ──────────────────── */}
      <div className="hidden lg:block lg:ml-60">
        <main className="p-8 min-h-screen animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile: top header + scrollable content + bottom tab nav ── */}
      <div className="lg:hidden flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 bg-white border-b border-app-border px-4 py-3 flex items-center gap-2">
          <ShieldIcon className="size-4 text-app-green" />
          <span className="text-sm font-semibold text-app-green">Admin Panel</span>
          <Link
            to="/"
            className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <LogOutIcon className="size-3.5" /> Exit
          </Link>
        </header>
        <main className="flex-1 px-4 py-5 pb-24 animate-fade-in">
          <Outlet />
        </main>
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-app-border flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors ${
                  isActive ? "text-app-green" : "text-zinc-400"
                }`
              }
            >
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
