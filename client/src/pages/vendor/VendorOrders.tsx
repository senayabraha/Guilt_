import { useEffect, useRef, useState } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import { RefreshCwIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { Order, Store } from "../../types";
import Loading from "../../components/Loading";
import { statusColors } from "../../assets/assets";
import { getMyStoreById } from "../../lib/db/stores";
import { getStoreOrders } from "../../lib/db/orders";
import { startPreparingOrder } from "../../lib/db/vendorOrders";
import { formatCurrency } from "../../lib/format";
import VendorOrderDetailModal from "../../components/vendor/VendorOrderDetailModal";

// Operationally relevant tabs for vendors. Delivery-phase statuses (Assigned,
// Picked Up, Out for Delivery) are visible under "All" but not a dedicated tab.
const FILTERS = [
  { value: "all", label: "All" },
  { value: "Placed", label: "New", urgent: true },
  { value: "Confirmed", label: "Confirmed" },
  { value: "Preparing", label: "Preparing" },
  { value: "Partially Available", label: "Partial" },
  { value: "Ready for Pickup", label: "Ready" },
  { value: "Delivered", label: "Done" },
  { value: "Cancelled", label: "Cancelled" },
];

// Auto-refresh interval (ms) — only when on a live-work filter.
const REFRESH_INTERVAL_MS = 30_000;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const NEW_STATUSES = new Set(["Placed", "Confirmed"]);

export default function VendorOrders() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [storeMissing, setStoreMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const fetchOrders = async (status: string, showLoader: boolean) => {
    if (!storeId) return;
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const s = await getMyStoreById(storeId);
      if (!s) { setStoreMissing(true); setOrders([]); return; }
      setStore(s);
      setOrders(await getStoreOrders(storeId, status));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders(filter, true);
    // Background refresh every 30 s while on live-work filters.
    const id = setInterval(
      () => fetchOrders(filterRef.current, false),
      REFRESH_INTERVAL_MS,
    );
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, storeId]);

  if (!storeId) return <Navigate to="/vendor" replace />;
  if (storeMissing) return <Navigate to="/vendor" replace />;

  const handleStartPreparing = async (order: Order) => {
    const id = order.id || order._id;
    setActionId(id);
    try {
      if (order.status === "Placed" || order.status === "Confirmed") {
        await startPreparingOrder(id);
        toast.success("Order preparation started.");
      }
      setSelectedOrder(null);
      navigate(`/vendor/orders/${id}/prepare`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to start preparation");
    } finally {
      setActionId(null);
    }
  };

  const renderAction = (order: Order) => {
    const id = order.id || order._id;
    const busy = actionId === id;
    if (order.status === "Placed" || order.status === "Confirmed") {
      return (
        <button
          type="button"
          disabled={busy}
          onClick={() => handleStartPreparing(order)}
          className="px-4 py-2 rounded-xl bg-app-green text-white text-xs font-semibold hover:bg-app-green/90 disabled:opacity-60 whitespace-nowrap"
        >
          {busy ? "Starting…" : "Start Preparing"}
        </button>
      );
    }
    if (order.status === "Preparing") {
      return (
        <Link
          to={`/vendor/orders/${id}/prepare`}
          className="px-4 py-2 rounded-xl bg-app-green text-white text-xs font-semibold hover:bg-app-green/90 whitespace-nowrap"
        >
          Continue Preparing
        </Link>
      );
    }
    if (order.status === "Partially Available") {
      return (
        <Link
          to={`/vendor/orders/${id}/prepare`}
          className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 whitespace-nowrap"
        >
          Review &amp; Confirm Ready
        </Link>
      );
    }
    if (order.status === "Ready for Pickup") {
      return (
        <span className="inline-flex px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold whitespace-nowrap">
          Awaiting Pickup
        </span>
      );
    }
    return <span className="text-xs text-zinc-400">—</span>;
  };

  const newOrderCount = orders.filter((o) => NEW_STATUSES.has(o.status)).length;

  return (
    <div className="space-y-5">
      <Link
        to={`/vendor/stores/${storeId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-app-text-light hover:text-app-green transition-colors"
      >
        ← Store dashboard
      </Link>

      {/* New-order alert banner */}
      {filter === "all" && newOrderCount > 0 && (
        <div className="flex items-center gap-3 bg-app-orange/10 border border-app-orange/30 rounded-2xl px-4 py-3 text-sm text-app-orange font-medium">
          <span className="size-2.5 rounded-full bg-app-orange animate-pulse shrink-0" />
          {newOrderCount} new order{newOrderCount !== 1 ? "s" : ""} need your attention
          <button
            type="button"
            onClick={() => setFilter("Placed")}
            className="ml-auto underline text-xs font-semibold"
          >
            View new →
          </button>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap items-center">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f.value
                ? "bg-app-green text-white border-app-green"
                : "bg-white text-zinc-600 border-app-border hover:bg-app-cream"
            }`}
          >
            {f.urgent && filter !== f.value && (
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-app-orange border border-white" />
            )}
            {f.label}
          </button>
        ))}
        <button
          type="button"
          disabled={refreshing}
          onClick={() => fetchOrders(filter, false)}
          title="Refresh orders"
          className="ml-auto p-2 rounded-xl border border-app-border text-app-text-light hover:text-app-green hover:border-app-green transition-colors disabled:opacity-40"
        >
          <RefreshCwIcon className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-app-border overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-app-border">
          <h2 className="text-lg font-semibold text-zinc-900">
            Orders{store?.name ? ` · ${store.name}` : ""}
          </h2>
          <p className="text-xs text-app-text-light mt-0.5">
            Start preparation → pick items → mark ready for delivery partner.
          </p>
        </div>

        {loading ? (
          <Loading />
        ) : orders.length === 0 ? (
          <div className="px-5 py-12 text-center text-zinc-500 text-sm">
            No orders found for this filter.
          </div>
        ) : (
          <>
            {/* Mobile card list (< sm) */}
            <div className="sm:hidden divide-y divide-app-border">
              {orders.map((order) => {
                const id = order.id || order._id;
                const isNew = NEW_STATUSES.has(order.status);
                return (
                  <div
                    key={id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 cursor-pointer active:bg-zinc-50 ${isNew ? "bg-orange-50/60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isNew && (
                            <span className="size-2 rounded-full bg-app-orange animate-pulse shrink-0" />
                          )}
                          <p className="font-semibold text-zinc-900 text-sm">
                            #{id.slice(-6).toUpperCase()}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[order.status] || "bg-zinc-100 text-zinc-600"}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          {timeAgo(order.createdAt)} ·{" "}
                          {typeof order.user === "object" ? order.user.name : "—"} ·{" "}
                          {order.items?.length || 0} items
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-zinc-900 text-sm">
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                    </div>
                    <div
                      className="mt-3 flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderAction(order)}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-app-border text-xs font-medium text-zinc-600 hover:bg-app-cream"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table (≥ sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-app-cream/50 text-zinc-500 uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Order</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Total</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {orders.map((order) => {
                    const id = order.id || order._id;
                    const isNew = NEW_STATUSES.has(order.status);
                    return (
                      <tr
                        key={id}
                        onClick={() => setSelectedOrder(order)}
                        className={`hover:bg-zinc-50/70 transition-colors cursor-pointer ${isNew ? "bg-orange-50/50" : ""}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {isNew && (
                              <span className="size-2 rounded-full bg-app-orange animate-pulse shrink-0" />
                            )}
                            <div>
                              <p className="font-semibold text-zinc-900">
                                #{id.slice(-6).toUpperCase()}
                              </p>
                              <p className="text-xs text-zinc-500 mt-0.5">
                                {timeAgo(order.createdAt)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-zinc-900">
                            {typeof order.user === "object" ? order.user.name : "—"}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-medium text-zinc-900">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || "bg-zinc-100 text-zinc-600"}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td
                          className="px-5 py-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {renderAction(order)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selectedOrder && (
        <VendorOrderDetailModal
          order={selectedOrder}
          actionLoading={actionId === (selectedOrder.id || selectedOrder._id)}
          onClose={() => setSelectedOrder(null)}
          onPrepare={handleStartPreparing}
        />
      )}
    </div>
  );
}
