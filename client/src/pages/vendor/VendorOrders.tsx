import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import Loading from "../../components/Loading";
import { statusColors } from "../../assets/assets";
import { getMyStore } from "../../lib/db/stores";
import { getStoreOrders, updateOrderStatus } from "../../lib/db/orders";
import { formatCurrency } from "../../lib/format";

const VENDOR_STATUSES = ["Confirmed", "Packed", "Ready for Pickup", "Cancelled"];
const FILTERS = [
  "all",
  "Placed",
  "Confirmed",
  "Packed",
  "Ready for Pickup",
  "Assigned",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

export default function VendorOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchOrders = async (status = filter) => {
    setLoading(true);
    try {
      const store = await getMyStore();
      if (!store) {
        setOrders([]);
        return;
      }
      setOrders(await getStoreOrders(store.id, status));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    // Vendor UI only offers Confirmed/Packed/Ready for Pickup/Cancelled.
    if (!VENDOR_STATUSES.includes(status)) return;
    try {
      await updateOrderStatus(id, status);
      toast.success(`Order marked ${status}`);
      fetchOrders(filter);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
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
          <h2 className="text-xl font-semibold text-zinc-900">Orders</h2>
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
                  <th className="px-6 py-4 text-right">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-zinc-500"
                    >
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order: any) => (
                    <tr
                      key={order.id}
                      className="hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-zinc-900">
                          #{order.id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-zinc-900">
                          {order.user?.name || "—"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {order.items?.length || 0} items
                        </p>
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
                      <td className="px-6 py-4 text-right">
                        <select
                          value=""
                          onChange={(e) =>
                            e.target.value &&
                            updateStatus(order.id, e.target.value)
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-app-border outline-none cursor-pointer bg-white"
                        >
                          <option value="">Set status…</option>
                          {VENDOR_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
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
