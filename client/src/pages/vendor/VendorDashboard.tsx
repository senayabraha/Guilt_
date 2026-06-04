import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  DollarSignIcon,
  ClockIcon,
  PackageIcon,
  AlertTriangleIcon,
  PlusIcon,
  SettingsIcon,
  ShoppingBagIcon,
} from "lucide-react";

import type { Store } from "../../types";
import Loading from "../../components/Loading";
import { statusColors } from "../../assets/assets";
import { getMyStoreById } from "../../lib/db/stores";
import { getStoreProducts } from "../../lib/db/products";
import { getStoreOrders } from "../../lib/db/orders";
import { formatCurrency } from "../../lib/format";

const LOW_STOCK_THRESHOLD = 5;
const PENDING_STATUSES = [
  "Placed",
  "Confirmed",
  "Packed",
  "Ready for Pickup",
  "Assigned",
];

const storeStatusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

// Store-scoped dashboard: every metric is for the single store in the URL.
export default function VendorDashboard() {
  const { storeId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    pendingOrders: 0,
    productCount: 0,
    lowStock: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!storeId) return;
      setLoading(true);
      try {
        const storeData = await getMyStoreById(storeId);
        if (!storeData) {
          navigate("/vendor", { replace: true });
          return;
        }
        setStore(storeData);

        const [products, orders] = await Promise.all([
          getStoreProducts(storeId),
          getStoreOrders(storeId),
        ]);

        const today = new Date().toDateString();
        const todayRevenue = orders
          .filter(
            (o: any) =>
              new Date(o.createdAt).toDateString() === today &&
              o.status !== "Cancelled",
          )
          .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

        const pendingOrders = orders.filter((o: any) =>
          PENDING_STATUSES.includes(o.status),
        ).length;

        const lowStock = products.filter(
          (p: any) => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD,
        ).length;

        setStats({
          todayRevenue,
          pendingOrders,
          productCount: products.length,
          lowStock,
        });
        setRecentOrders(orders.slice(0, 6));
      } catch {
        navigate("/vendor", { replace: true });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId, navigate]);

  if (loading) return <Loading />;
  if (!store) return null;

  const cards = [
    {
      label: "Today's Revenue",
      value: formatCurrency(stats.todayRevenue),
      icon: DollarSignIcon,
    },
    { label: "Pending Orders", value: stats.pendingOrders, icon: ClockIcon },
    { label: "Products", value: stats.productCount, icon: PackageIcon },
    { label: "Low Stock", value: stats.lowStock, icon: AlertTriangleIcon },
  ];

  const quickActions = [
    { to: `/vendor/stores/${store.id}/orders`, label: "Orders", icon: ShoppingBagIcon },
    { to: `/vendor/products?store=${store.id}`, label: "Products", icon: PackageIcon },
    { to: `/vendor/stores/${store.id}/settings`, label: "Settings", icon: SettingsIcon },
    { to: `/vendor/products/new?store=${store.id}`, label: "Add Product", icon: PlusIcon },
  ];

  return (
    <div className="space-y-6">
      <Link
        to="/vendor"
        className="inline-flex items-center gap-1.5 text-sm text-app-text-light hover:text-app-green transition-colors"
      >
        <ArrowLeftIcon className="size-4" /> My Stores
      </Link>

      {/* Store status banner */}
      <div className="bg-white rounded-2xl p-5 border border-app-border flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-app-cream overflow-hidden flex-center shrink-0">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <PackageIcon className="size-5 text-app-green" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-app-green">{store.name}</h1>
            <p className="text-sm text-app-text-light">
              {[store.state, store.city].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${storeStatusColors[store.status] || "bg-zinc-100 text-zinc-600"}`}
          >
            {store.status}
          </span>
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${store.isOpen ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-600"}`}
          >
            {store.isOpen ? "Open" : "Closed"}
          </span>
        </div>
      </div>

      {store.status === "PENDING" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm">
          This store is pending admin approval. You can set it up now, but you
          cannot create products or receive orders until it's approved.
        </div>
      )}
      {store.status === "SUSPENDED" && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm">
          This store has been suspended. Please contact support for assistance.
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="bg-white rounded-xl border border-app-border p-4 flex items-center gap-2 text-sm font-medium text-app-green hover:bg-app-cream transition-colors"
          >
            <a.icon className="size-4" /> {a.label}
          </Link>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-5 border border-app-border flex justify-between gap-3"
          >
            <div>
              <p className="text-2xl font-semibold text-zinc-900">{card.value}</p>
              <p className="text-sm text-app-text-light">{card.label}</p>
            </div>
            <div className="size-10 rounded-xl flex-center bg-orange-50 text-orange-600">
              <card.icon className="size-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
        <div className="px-6 py-5 border-b border-app-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Recent Orders</h2>
          <Link
            to={`/vendor/stores/${store.id}/orders`}
            className="text-sm font-medium text-app-orange hover:text-app-orange-dark transition-colors"
          >
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-app-cream/50 text-zinc-500 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-zinc-900">
                      {order.user?.name || "—"}
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      {order.items?.length || 0} items
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || "bg-zinc-100 text-zinc-600"}`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
