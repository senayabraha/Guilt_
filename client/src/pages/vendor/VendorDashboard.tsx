import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BanknoteIcon,
  ClockIcon,
  EditIcon,
  PackageIcon,
  PlusIcon,
  SettingsIcon,
  ShoppingBagIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import type { Product, Store } from "../../types";
import Loading from "../../components/Loading";
import { statusColors } from "../../assets/assets";
import { getMyStoreById, updateMyStore } from "../../lib/db/stores";
import { getStoreProducts } from "../../lib/db/products";
import { getStoreOrders } from "../../lib/db/orders";
import { formatCurrency } from "../../lib/format";

const LOW_STOCK_THRESHOLD = 5;
const ACTION_NEEDED_STATUSES = ["Placed", "Confirmed"];

const storeStatusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

const storeStatusLabels: Record<string, string> = {
  PENDING: "Under Review",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
};

// Store-scoped dashboard: every metric is for the single store in the URL.
export default function VendorDashboard() {
  const { storeId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    pendingOrders: 0,
    activeProducts: 0,
    lowStock: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [actionableOrders, setActionableOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

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
        setIsOpen(storeData.isOpen);

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
          ["Placed", "Confirmed", "Packed", "Ready for Pickup", "Assigned"].includes(o.status),
        ).length;

        const actionable = orders.filter((o: any) =>
          ACTION_NEEDED_STATUSES.includes(o.status),
        );

        const lowStockList = products
          .filter((p: any) => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD)
          .sort((a: any, b: any) => (a.stock ?? 0) - (b.stock ?? 0));

        setStats({
          todayRevenue,
          pendingOrders,
          activeProducts: products.filter((p: any) => p.isActive !== false).length,
          lowStock: lowStockList.length,
        });
        setRecentOrders(orders.slice(0, 6));
        setActionableOrders(actionable);
        setLowStockProducts(lowStockList.slice(0, 6));
      } catch {
        navigate("/vendor", { replace: true });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [storeId, navigate]);

  const handleToggleOpen = async () => {
    if (!store || store.status !== "APPROVED") return;
    setToggling(true);
    try {
      const updated = await updateMyStore(store.id, { isOpen: !isOpen });
      setIsOpen(updated.isOpen);
      toast.success(
        updated.isOpen
          ? "Store is now open — customers can place orders."
          : "Store is now closed — no new orders until you reopen.",
      );
    } catch {
      toast.error("Failed to update store status.");
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <Loading />;
  if (!store) return null;

  const hasPendingAction = actionableOrders.length > 0;
  const hasLowStock = lowStockProducts.length > 0;

  const statCards = [
    {
      label: "Pending Orders",
      value: stats.pendingOrders,
      icon: ClockIcon,
      to: `/vendor/stores/${store.id}/orders`,
      urgent: stats.pendingOrders > 0,
      urgentClass: "border-app-orange/30 bg-orange-50",
      valueClass: stats.pendingOrders > 0 ? "text-app-orange" : "text-zinc-900",
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(stats.todayRevenue),
      icon: BanknoteIcon,
      to: null,
      urgent: false,
      urgentClass: "",
      valueClass: "text-zinc-900",
    },
    {
      label: "Active Products",
      value: stats.activeProducts,
      icon: PackageIcon,
      to: `/vendor/products?store=${store.id}`,
      urgent: false,
      urgentClass: "",
      valueClass: "text-zinc-900",
    },
    {
      label: "Low Stock",
      value: stats.lowStock,
      icon: AlertTriangleIcon,
      to: null,
      urgent: stats.lowStock > 0,
      urgentClass: "border-amber-200 bg-amber-50",
      valueClass: stats.lowStock > 0 ? "text-amber-600" : "text-zinc-900",
    },
  ];

  return (
    <div className="space-y-5">
      <Link
        to="/vendor"
        className="inline-flex items-center gap-1.5 text-sm text-app-text-light hover:text-app-green transition-colors"
      >
        <ArrowLeftIcon className="size-4" /> My Stores
      </Link>

      {/* Store banner */}
      <div className="bg-white rounded-2xl p-5 border border-app-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-xl bg-app-cream overflow-hidden flex items-center justify-center shrink-0">
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <PackageIcon className="size-6 text-app-green" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-app-green">
                {store.name}
              </h1>
              <p className="text-sm text-app-text-light">
                {[store.state, store.city].filter(Boolean).join(", ")}
              </p>
              <span
                className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${storeStatusColors[store.status] || "bg-zinc-100 text-zinc-600"}`}
              >
                {storeStatusLabels[store.status] || store.status}
              </span>
            </div>
          </div>

          {/* Open/Close toggle — only meaningful for approved stores */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleToggleOpen}
              disabled={toggling || store.status !== "APPROVED"}
              role="switch"
              aria-checked={isOpen}
              title={
                store.status !== "APPROVED"
                  ? "Store must be approved to go live"
                  : isOpen
                    ? "Click to close store"
                    : "Click to open store"
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-app-green/30 ${
                isOpen ? "bg-app-green" : "bg-zinc-300"
              }`}
            >
              <span
                className={`inline-block size-5 bg-white rounded-full shadow-sm transition-transform ${
                  isOpen ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
            <div className="text-right">
              <p
                className={`text-sm font-semibold leading-none ${
                  isOpen ? "text-app-green" : "text-zinc-500"
                }`}
              >
                {toggling ? "Updating…" : isOpen ? "Open" : "Closed"}
              </p>
              <p className="text-[10px] text-app-text-light mt-0.5">
                {store.status === "APPROVED"
                  ? "accepting orders"
                  : "store not approved"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status banners */}
      {store.status === "PENDING" && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-sm">
          Your store is pending admin approval. You can configure your store now,
          but customers won't see products until it's approved.
        </div>
      )}
      {store.status === "SUSPENDED" && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm">
          Your store has been suspended. Contact Zembil Market support for
          assistance.
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => {
          const inner = (
            <div
              className={`bg-white rounded-2xl p-4 border flex items-start justify-between gap-3 transition-colors ${
                card.urgent
                  ? card.urgentClass
                  : "border-app-border"
              } ${card.to ? "hover:border-app-green cursor-pointer" : ""}`}
            >
              <div>
                <p className={`text-2xl font-bold leading-none ${card.valueClass}`}>
                  {card.value}
                </p>
                <p className="text-xs text-app-text-light mt-1">{card.label}</p>
              </div>
              <div
                className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                  card.urgent ? "bg-white/70" : "bg-orange-50"
                }`}
              >
                <card.icon
                  className={`size-4 ${card.urgent ? (card.label === "Low Stock" ? "text-amber-500" : "text-app-orange") : "text-orange-500"}`}
                />
              </div>
            </div>
          );
          return card.to ? (
            <Link key={card.label} to={card.to}>
              {inner}
            </Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to={`/vendor/stores/${store.id}/orders`}
          className={`rounded-xl border p-4 flex items-center gap-2 text-sm font-semibold transition-colors ${
            hasPendingAction
              ? "bg-app-orange text-white border-app-orange hover:bg-app-orange-dark"
              : "bg-white border-app-border text-app-green hover:bg-app-cream"
          }`}
        >
          <ShoppingBagIcon className="size-4 shrink-0" />
          <span>Orders</span>
          {hasPendingAction && (
            <span className="ml-auto size-5 flex items-center justify-center rounded-full bg-white text-app-orange text-[10px] font-bold">
              {actionableOrders.length}
            </span>
          )}
        </Link>
        <Link
          to={`/vendor/products/new?store=${store.id}`}
          className="bg-app-green text-white rounded-xl border border-app-green p-4 flex items-center gap-2 text-sm font-semibold hover:bg-app-green-light transition-colors"
        >
          <PlusIcon className="size-4 shrink-0" /> Add Product
        </Link>
        <Link
          to={`/vendor/products?store=${store.id}`}
          className="bg-white rounded-xl border border-app-border p-4 flex items-center gap-2 text-sm font-medium text-app-green hover:bg-app-cream transition-colors"
        >
          <PackageIcon className="size-4 shrink-0" /> Products
        </Link>
        <Link
          to={`/vendor/stores/${store.id}/settings`}
          className="bg-white rounded-xl border border-app-border p-4 flex items-center gap-2 text-sm font-medium text-app-green hover:bg-app-cream transition-colors"
        >
          <SettingsIcon className="size-4 shrink-0" /> Settings
        </Link>
      </div>

      {/* Actionable Orders — orders needing preparation */}
      {hasPendingAction && (
        <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
          <div className="px-5 py-4 border-b border-app-border bg-orange-50 flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <span className="size-2 rounded-full bg-app-orange animate-pulse" />
              {actionableOrders.length} order
              {actionableOrders.length !== 1 ? "s" : ""} need preparation
            </h2>
            <Link
              to={`/vendor/stores/${store.id}/orders`}
              className="text-xs font-medium text-app-orange hover:text-app-orange-dark"
            >
              View all orders →
            </Link>
          </div>
          <div className="divide-y divide-app-border">
            {actionableOrders.slice(0, 4).map((order: any) => (
              <div
                key={order.id}
                className="px-5 py-3.5 flex items-center gap-3 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">
                    #{order.id.slice(-6).toUpperCase()}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {order.items?.length || 0} items ·{" "}
                    {formatCurrency(order.total)} ·{" "}
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[order.status] || "bg-zinc-100 text-zinc-600"}`}
                >
                  {order.status}
                </span>
                <Link
                  to={`/vendor/stores/${store.id}/orders`}
                  className="px-3 py-1.5 bg-app-green text-white text-xs font-semibold rounded-lg hover:bg-app-green-light transition-colors shrink-0"
                >
                  Prepare
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Panel */}
      {hasLowStock && (
        <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
          <div className="px-5 py-4 border-b border-app-border flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <AlertTriangleIcon className="size-4 text-amber-500" />
              Low stock — {lowStockProducts.length} product
              {lowStockProducts.length !== 1 ? "s" : ""}
            </h2>
            <Link
              to={`/vendor/products?store=${store.id}`}
              className="text-xs font-medium text-app-orange hover:text-app-orange-dark"
            >
              Manage all products →
            </Link>
          </div>
          <div className="divide-y divide-app-border">
            {lowStockProducts.map((product: any) => {
              const pid = product.id || product._id;
              return (
                <div key={pid} className="px-5 py-3.5 flex items-center gap-3">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="size-10 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">
                      {product.name}
                    </p>
                    <p
                      className={`text-xs font-semibold mt-0.5 ${
                        product.stock === 0
                          ? "text-red-600"
                          : "text-amber-600"
                      }`}
                    >
                      {product.stock === 0
                        ? "Out of stock"
                        : `Only ${product.stock} left`}
                    </p>
                  </div>
                  <Link
                    to={`/vendor/products/${pid}/edit`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-app-border rounded-lg hover:border-app-green hover:text-app-green transition-colors shrink-0"
                  >
                    <EditIcon className="size-3" /> Update
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
        <div className="px-5 py-4 border-b border-app-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            Recent Orders
          </h2>
          <Link
            to={`/vendor/stores/${store.id}/orders`}
            className="text-sm font-medium text-app-orange hover:text-app-orange-dark transition-colors"
          >
            View all →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ShoppingBagIcon className="size-10 text-app-border mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-500">
              No orders yet
            </p>
            <p className="text-xs text-app-text-light mt-1">
              Orders will appear here once customers start buying.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-app-cream/50 text-zinc-500 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Items</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {recentOrders.map((order: any) => (
                  <tr
                    key={order.id}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-zinc-500">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-800 font-medium">
                      {order.user?.name || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500 hidden sm:table-cell">
                      {order.items?.length || 0}
                    </td>
                    <td className="px-5 py-3.5 font-medium">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[order.status] || "bg-zinc-100 text-zinc-600"}`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
