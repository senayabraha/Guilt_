import { useEffect, useState } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import type { Order, Store } from "../../types";
import Loading from "../../components/Loading";
import { statusColors } from "../../assets/assets";
import { getMyStoreById } from "../../lib/db/stores";
import { getStoreOrders } from "../../lib/db/orders";
import { startPreparingOrder } from "../../lib/db/vendorOrders";
import { formatCurrency } from "../../lib/format";

const FILTERS = [
  "all",
  "Placed",
  "Confirmed",
  "Preparing",
  "Partially Available",
  "Ready for Pickup",
  "Assigned",
  "Packed",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

export default function VendorOrders() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [storeMissing, setStoreMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const fetchOrders = async (status = filter) => {
    if (!storeId) return;
    setLoading(true);
    try {
      const s = await getMyStoreById(storeId);
      if (!s) {
        setStoreMissing(true);
        setOrders([]);
        return;
      }
      setStore(s);
      setOrders(await getStoreOrders(storeId, status));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(filter);
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
      navigate(`/vendor/orders/${id}/prepare`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to start preparation");
    } finally {
      setActionId(null);
    }
  };

  const renderPreparationAction = (order: Order) => {
    const id = order.id || order._id;
    if (order.status === "Placed" || order.status === "Confirmed") {
      return (
        <button
          type="button"
          disabled={actionId === id}
          onClick={() => handleStartPreparing(order)}
          className="px-4 py-2 rounded-xl bg-app-green text-white text-xs font-semibold hover:bg-app-green/90 disabled:opacity-60"
        >
          {actionId === id ? "Starting…" : "Start Preparing"}
        </button>
      );
    }
    if (order.status === "Preparing") {
      return (
        <Link
          to={`/vendor/orders/${id}/prepare`}
          className="px-4 py-2 rounded-xl bg-app-green text-white text-xs font-semibold hover:bg-app-green/90"
        >
          Continue Preparing
        </Link>
      );
    }
    if (order.status === "Partially Available") {
      return (
        <Link
          to={`/vendor/orders/${id}/prepare`}
          className="px-4 py-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-semibold hover:bg-amber-200"
        >
          Review & Mark Ready
        </Link>
      );
    }
    if (order.status === "Ready for Pickup") {
      return (
        <span className="inline-flex px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
          Ready for Pickup
        </span>
      );
    }
    if (order.status === "Cancelled") {
      return (
        <span className="inline-flex px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
          Cancelled
        </span>
      );
    }
    return <span className="text-xs text-zinc-400">—</span>;
  };

  return (
    <div className="space-y-5">
      <Link
        to={`/vendor/stores/${storeId}`}
        className="inline-flex items-center text-sm font-medium text-zinc-600 hover:text-app-green transition-colors"
      >
        ← Store dashboard
      </Link>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === f ? "bg-app-green text-white border-app-green" : "bg-white text-zinc-600 border-app-border hover:bg-app-cream"}`}
          >
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-app-border overflow-hidden">
        <div className="px-6 py-5 border-b border-app-border">
          <h2 className="text-xl font-semibold text-zinc-900">
            Orders{store?.name ? ` · ${store.name}` : ""}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Start preparation, pick each grocery item, and mark ready for delivery partner pickup.
          </p>
        </div>
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-app-cream/50 text-zinc-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Preparation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-zinc-900">
                          #{(order.id || order._id).slice(-6).toUpperCase()}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-zinc-900">
                          {typeof order.user === "object" ? order.user.name : "—"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {order.items?.length || 0} items
                        </p>
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || "bg-zinc-100 text-zinc-600"}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {renderPreparationAction(order)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
