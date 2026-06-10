import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  PackageIcon,
  UsersIcon,
  ShoppingBagIcon,
  AlertTriangleIcon,
  StoreIcon,
  TruckIcon,
  CheckIcon,
  ClockIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import Loading from "../../components/Loading";
import { statusColors } from "../../assets/assets";
import { supabase } from "../../lib/supabase";
import { getAllOrders } from "../../lib/db/orders";
import { getAllStores, setStoreStatus } from "../../lib/db/stores";
import { getAllPartners } from "../../lib/db/deliveryPartners";
import { formatCurrency } from "../../lib/format";
import type { Store, DeliveryPartner } from "../../types";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [counts, setCounts] = useState({ users: 0, products: 0, outOfStock: 0 });
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [ordersData, storesData, partnersData, usersRes, productsRes, outRes] =
        await Promise.all([
          getAllOrders(),
          getAllStores(),
          getAllPartners(),
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("products").select("*", { count: "exact", head: true }),
          supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("stock", 0),
        ]);
      setOrders(ordersData);
      setStores(storesData);
      setPartners(partnersData);
      setCounts({
        users: usersRes.count ?? 0,
        products: productsRes.count ?? 0,
        outOfStock: outRes.count ?? 0,
      });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pendingStores = useMemo(
    () => stores.filter((s) => s.status === "PENDING"),
    [stores],
  );
  const activePartnerCount = useMemo(
    () => partners.filter((p) => p.isActive).length,
    [partners],
  );
  const needsAttention = useMemo(
    () =>
      [...orders]
        .filter((o) => o.status === "Placed")
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .slice(0, 5),
    [orders],
  );
  const recentOrders = useMemo(() => orders.slice(0, 8), [orders]);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await setStoreStatus(id, "APPROVED");
      toast.success("Store approved");
      setStores((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: "APPROVED" as const } : s)),
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve");
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) return <Loading />;

  const statCards = [
    {
      label: "Total Orders",
      value: orders.length,
      icon: ShoppingBagIcon,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Users",
      value: counts.users,
      icon: UsersIcon,
      color: "bg-violet-50 text-violet-600",
    },
    {
      label: "Total Products",
      value: counts.products,
      icon: PackageIcon,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "Out of Stock",
      value: counts.outOfStock,
      icon: AlertTriangleIcon,
      color: "bg-red-50 text-red-600",
    },
    {
      label: "Pending Stores",
      value: pendingStores.length,
      icon: StoreIcon,
      color:
        pendingStores.length > 0
          ? "bg-amber-50 text-amber-600"
          : "bg-zinc-100 text-zinc-400",
    },
    {
      label: "Active Partners",
      value: activePartnerCount,
      icon: TruckIcon,
      color: "bg-indigo-50 text-indigo-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-5 border border-app-border flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-2xl font-semibold text-zinc-900">{card.value}</p>
              <p className="text-sm text-app-text-light">{card.label}</p>
            </div>
            <div
              className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${card.color}`}
            >
              <card.icon className="size-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Pending stores — surfaced for immediate action */}
      {pendingStores.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-sm font-semibold text-amber-900">
                {pendingStores.length} Store
                {pendingStores.length > 1 ? "s" : ""} Awaiting Approval
              </h2>
            </div>
            <Link
              to="/admin/stores"
              className="text-xs font-medium text-amber-700 hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingStores.slice(0, 3).map((store) => (
              <div key={store.id} className="px-6 py-4 flex items-center gap-4">
                <div className="size-10 rounded-xl bg-white border border-amber-100 overflow-hidden flex items-center justify-center shrink-0">
                  {store.logo ? (
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <StoreIcon className="size-5 text-app-green" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 text-sm truncate">
                    {store.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {store.owner?.name} · {store.city}, {store.state}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/admin/stores/${store.id}`}
                    className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleApprove(store.id)}
                    disabled={approvingId === store.id}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-app-green rounded-lg hover:bg-green-950 transition-colors disabled:opacity-60 flex items-center gap-1"
                  >
                    <CheckIcon className="size-3" />
                    {approvingId === store.id ? "Approving…" : "Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs attention: oldest unconfirmed Placed orders */}
      {needsAttention.length > 0 && (
        <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
          <div className="px-6 py-5 border-b border-app-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClockIcon className="size-4 text-orange-500" />
              <h2 className="text-base font-semibold text-zinc-900">
                Needs Attention
              </h2>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                {needsAttention.length} unconfirmed
              </span>
            </div>
            <Link
              to="/admin/orders"
              className="text-sm font-medium text-app-orange hover:text-app-orange-dark transition-colors"
            >
              View All →
            </Link>
          </div>
          <div className="divide-y divide-app-border">
            {needsAttention.map((order) => {
              const mins = Math.floor(
                (Date.now() - new Date(order.createdAt).getTime()) / 60_000,
              );
              return (
                <div key={order.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">
                      #{order.id.slice(-6).toUpperCase()}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {order.user?.name} · {order.store?.name || "Platform"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">
                      {formatCurrency(order.total)}
                    </p>
                    <p
                      className={`text-xs ${mins > 30 ? "text-red-500 font-medium" : "text-zinc-500"}`}
                    >
                      {mins < 1 ? "just now" : `${mins}m ago`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent orders table */}
      <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
        <div className="px-6 py-5 border-b border-app-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Recent Orders</h2>
          <Link
            to="/admin/orders"
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
                <th className="px-6 py-3 hidden sm:table-cell">Items</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order: any) => (
                  <tr
                    key={order.id}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900">
                        {order.user?.name || "—"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {order.user?.email || ""}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 hidden sm:table-cell">
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
                    <td className="px-6 py-4 text-zinc-500 hidden sm:table-cell">
                      {new Date(order.createdAt).toLocaleDateString()}
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
