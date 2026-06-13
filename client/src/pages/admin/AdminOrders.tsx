import { useState, useEffect, useMemo } from "react";
import { TruckIcon, SearchIcon, XIcon, ClipboardListIcon } from "lucide-react";
import toast from "react-hot-toast";

import type { DeliveryPartner } from "../../types";
import Loading from "../../components/Loading";
import StatusState from "../../components/StatusState";
import {
  getAllOrders,
  updateOrderStatus,
  assignDeliveryPartner,
} from "../../lib/db/orders";
import { getAllPartners } from "../../lib/db/deliveryPartners";
import { formatCurrency } from "../../lib/format";
import { statusColors } from "../../assets/assets";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "Placed", label: "Placed" },
  { value: "Confirmed", label: "Confirmed" },
  { value: "Preparing", label: "Preparing" },
  { value: "Partially Available", label: "Partial" },
  { value: "Ready for Pickup", label: "Ready" },
  { value: "Picked Up", label: "Picked Up" },
  { value: "Out for Delivery", label: "In Transit" },
  { value: "Delivered", label: "Delivered" },
  { value: "Failed Delivery", label: "Failed" },
  { value: "Cancelled", label: "Cancelled" },
];

const STATUS_OPTIONS = [
  "Placed",
  "Confirmed",
  "Preparing",
  "Partially Available",
  "Ready for Pickup",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
  "Failed Delivery",
  "Cancelled",
];

const ORDER_STATUS_COLORS: Record<string, string> = {
  Placed: "bg-blue-100 text-blue-800",
  Confirmed: "bg-amber-100 text-amber-800",
  Preparing: "bg-indigo-100 text-indigo-800",
  "Partially Available": "bg-amber-100 text-amber-800",
  "Ready for Pickup": "bg-green-100 text-green-800",
  "Picked Up": "bg-cyan-100 text-cyan-800",
  "Out for Delivery": "bg-purple-100 text-purple-800",
  Delivered: "bg-green-100 text-green-800",
  "Failed Delivery": "bg-orange-100 text-orange-800",
  Cancelled: "bg-red-100 text-red-800",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [assignModal, setAssignModal] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState("");

  const fetchOrders = async () => {
    try {
      setOrders(await getAllOrders());
    } catch (error: any) {
      toast.error(error?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    getAllPartners()
      .then((all) => setPartners(all.filter((p) => p.isActive)))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let list = orders;
    if (filterStatus !== "all") list = list.filter((o) => o.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.user?.name || "").toLowerCase().includes(q) ||
          (o.user?.email || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [orders, filterStatus, search]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateOrderStatus(id, newStatus);
      toast.success("Status updated");
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)),
      );
      if (detailOrder?.id === id)
        setDetailOrder((d: any) => (d ? { ...d, status: newStatus } : d));
    } catch (error: any) {
      toast.error(error?.message || "Failed");
    }
  };

  const handleAssign = async () => {
    if (!assignModal || !selectedPartner) return;
    try {
      await assignDeliveryPartner(assignModal, selectedPartner);
      toast.success("Delivery partner assigned!");
      setAssignModal(null);
      setSelectedPartner("");
      fetchOrders();
    } catch (error: any) {
      toast.error(error?.message || "Failed");
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <div className="space-y-4">
        {/* Header + search */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-zinc-900 flex-1">Orders</h1>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by ID or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-app-border focus:border-app-green outline-none w-56"
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              type="button"
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterStatus === f.value
                  ? "bg-app-green text-white"
                  : "bg-white border border-app-border text-zinc-500 hover:bg-zinc-50"
              }`}
            >
              {f.label}
              {f.value !== "all" && (
                <span className="ml-1 opacity-70">
                  ({orders.filter((o) => o.status === f.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders table */}
        <div className="bg-white rounded-2xl shadow-sm border border-app-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-app-cream/50 text-zinc-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4 hidden sm:table-cell">Store</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 hidden md:table-cell">Total</th>
                  <th className="px-6 py-4 hidden lg:table-cell">Partner</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8">
                      <StatusState
                        icon={ClipboardListIcon}
                        title={search ? "No orders match your search" : "No orders found"}
                        description={
                          search
                            ? "Try searching by a different order ID or customer."
                            : "Marketplace orders will appear here once customers check out."
                        }
                        className="border-dashed"
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((order: any) => (
                    <tr
                      key={order.id}
                      onClick={() => setDetailOrder(order)}
                      className="hover:bg-zinc-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-zinc-900">
                          #{order.id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell text-zinc-700">
                        {order.store?.name || "Platform"}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-zinc-900">
                          {order.user?.name || "—"}
                        </p>
                        <p className="text-xs text-zinc-500 hidden sm:block">
                          {order.user?.email}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-medium hidden md:table-cell">
                        {formatCurrency(order.total)}
                      </td>
                      <td
                        className="px-6 py-4 hidden lg:table-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {order.deliveryPartner ? (
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-app-green flex items-center justify-center shrink-0">
                              <span className="text-white text-[10px] font-semibold">
                                {order.deliveryPartner.name?.charAt(0)}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-zinc-900">
                              {order.deliveryPartner.name}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignModal(order.id);
                              setSelectedPartner("");
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                          >
                            <TruckIcon className="size-3" /> Assign
                          </button>
                        )}
                      </td>
                      <td
                        className="px-6 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value)
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-r-8 border-transparent outline-none cursor-pointer leading-tight ${ORDER_STATUS_COLORS[order.status] || "bg-zinc-100 text-zinc-800"}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
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
        </div>
      </div>

      {/* Order detail slide-over */}
      {detailOrder && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setDetailOrder(null)}
            aria-hidden="true"
          />
          <aside
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 overflow-y-auto animate-fade-in shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-order-detail-title"
          >
            <div className="sticky top-0 bg-white border-b border-app-border px-6 py-4 flex items-center justify-between">
              <div>
                <p id="admin-order-detail-title" className="font-semibold text-zinc-900">
                  Order #{detailOrder.id.slice(-6).toUpperCase()}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(detailOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                className="p-2 hover:bg-app-cream rounded-lg transition-colors"
                aria-label="Close order details"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status + store */}
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[detailOrder.status] || "bg-zinc-100 text-zinc-600"}`}
                >
                  {detailOrder.status}
                </span>
                {detailOrder.store?.name && (
                  <span className="text-xs text-zinc-500">
                    {detailOrder.store.name}
                  </span>
                )}
              </div>

              {/* Items */}
              <div>
                <p className="text-xs uppercase font-semibold text-zinc-400 mb-3">
                  Items
                </p>
                <div className="space-y-3">
                  {(detailOrder.items || []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-10 rounded-lg bg-app-cream shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900 shrink-0">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-app-cream/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(detailOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Delivery fee</span>
                  <span>{formatCurrency(detailOrder.deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-semibold text-zinc-900 pt-2 border-t border-app-border">
                  <span>Total</span>
                  <span>{formatCurrency(detailOrder.total)}</span>
                </div>
              </div>

              {/* Shipping address */}
              {detailOrder.shippingAddress && (
                <div>
                  <p className="text-xs uppercase font-semibold text-zinc-400 mb-2">
                    Delivery Address
                  </p>
                  <div className="text-sm text-zinc-700 space-y-0.5">
                    <p className="font-medium">{detailOrder.shippingAddress.label}</p>
                    <p>{detailOrder.shippingAddress.address}</p>
                    <p>
                      {detailOrder.shippingAddress.area ||
                        detailOrder.shippingAddress.state}
                      , {detailOrder.shippingAddress.city}
                    </p>
                    {detailOrder.shippingAddress.phone && (
                      <p>{detailOrder.shippingAddress.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Customer */}
              <div>
                <p className="text-xs uppercase font-semibold text-zinc-400 mb-2">
                  Customer
                </p>
                <p className="text-sm font-medium text-zinc-900">
                  {detailOrder.user?.name || "—"}
                </p>
                <p className="text-xs text-zinc-500">{detailOrder.user?.email}</p>
              </div>

              {/* Delivery partner */}
              {detailOrder.deliveryPartner ? (
                <div>
                  <p className="text-xs uppercase font-semibold text-zinc-400 mb-2">
                    Delivery Partner
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-app-green flex items-center justify-center shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {detailOrder.deliveryPartner.name?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {detailOrder.deliveryPartner.name}
                      </p>
                      <p className="text-xs text-zinc-500 capitalize">
                        {detailOrder.deliveryPartner.vehicleType} ·{" "}
                        {detailOrder.deliveryPartner.phone}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs uppercase font-semibold text-zinc-400 mb-2">
                    Delivery Partner
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignModal(detailOrder.id);
                      setSelectedPartner("");
                      setDetailOrder(null);
                    }}
                    className="w-full py-2.5 text-sm font-medium bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <TruckIcon className="size-4" /> Assign Delivery Partner
                  </button>
                </div>
              )}

              {/* Failure / cancellation reason */}
              {(detailOrder.status === "Cancelled" ||
                detailOrder.status === "Failed Delivery") && (
                <div>
                  <p className="text-xs uppercase font-semibold text-zinc-400 mb-2">
                    {detailOrder.status === "Failed Delivery"
                      ? "Failure Reason"
                      : "Cancellation Reason"}
                  </p>
                  {(() => {
                    const history: any[] = Array.isArray(
                      detailOrder.statusHistory,
                    )
                      ? detailOrder.statusHistory
                      : Array.isArray(detailOrder.status_history)
                        ? detailOrder.status_history
                        : [];
                    const entry = [...history]
                      .reverse()
                      .find(
                        (h: any) =>
                          h.status === detailOrder.status ||
                          h.status === "Cancelled" ||
                          h.status === "Failed Delivery",
                      );
                    return entry?.note ? (
                      <div
                        className={`rounded-xl px-4 py-3 space-y-1 ${
                          detailOrder.status === "Failed Delivery"
                            ? "bg-orange-50"
                            : "bg-red-50"
                        }`}
                      >
                        <p
                          className={`text-sm ${
                            detailOrder.status === "Failed Delivery"
                              ? "text-orange-800"
                              : "text-red-800"
                          }`}
                        >
                          {entry.note}
                        </p>
                        {entry.timestamp && (
                          <p
                            className={`text-xs ${
                              detailOrder.status === "Failed Delivery"
                                ? "text-orange-500"
                                : "text-red-400"
                            }`}
                          >
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                        )}
                        {entry.actor && (
                          <p className="text-xs text-zinc-400 capitalize">
                            Reported by: {entry.actor.replace(/_/g, " ")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">No reason recorded</p>
                    );
                  })()}
                </div>
              )}

              {/* Update status */}
              <div>
                <p className="text-xs uppercase font-semibold text-zinc-400 mb-2">
                  Update Status
                </p>
                <select
                  value={detailOrder.status}
                  onChange={(e) =>
                    handleStatusChange(detailOrder.id, e.target.value)
                  }
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-app-border focus:border-app-green outline-none bg-white"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Assign delivery partner modal */}
      {assignModal && (
        <>
          <div
            className="fixed inset-0 bg-app-cream/80 backdrop-blur z-50"
            onClick={() => setAssignModal(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-sm animate-fade-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="assign-partner-title"
            >
              <h3 id="assign-partner-title" className="text-lg font-semibold text-app-green mb-4">
                Assign Delivery Partner
              </h3>
              {partners.length === 0 ? (
                <p className="text-sm text-zinc-500 mb-4">
                  No active delivery partners. Onboard a partner first.
                </p>
              ) : (
                <div className="space-y-2 mb-5 max-h-60 overflow-y-auto">
                  {partners.map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedPartner === p.id ? "border-app-green bg-app-green/5" : "border-app-border hover:bg-app-cream"}`}
                    >
                      <input
                        type="radio"
                        name="partner"
                        value={p.id}
                        checked={selectedPartner === p.id}
                        onChange={() => setSelectedPartner(p.id || p._id)}
                        className="text-app-green"
                      />
                      <div className="size-8 rounded-full bg-app-green flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-semibold">
                          {p.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {p.name}
                        </p>
                        <p className="text-xs text-zinc-500 capitalize">
                          {p.vehicleType} · {p.phone}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModal(null)}
                  className="flex-1 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={!selectedPartner}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-app-green rounded-xl hover:bg-app-green-light transition-colors disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
