import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  PackageCheckIcon,
  XCircleIcon,
} from "lucide-react";

import Loading from "../../components/Loading";
import { statusColors } from "../../assets/assets";
import {
  completeOrderPreparation,
  confirmReadyForPickup,
  getVendorOrder,
  startPreparingOrder,
  updateOrderItemPrepStatus,
} from "../../lib/db/vendorOrders";
import type { Order, OrderItem, OrderPrepStatus } from "../../types";
import { formatCurrency } from "../../lib/format";

const UNAVAILABLE_REASONS = [
  "Out of stock",
  "Damaged item",
  "Not enough quantity",
  "Other",
];

const prepStatusClasses: Record<OrderPrepStatus, string> = {
  pending: "bg-zinc-100 text-zinc-600",
  picked: "bg-green-100 text-green-700",
  not_available: "bg-amber-100 text-amber-800",
};

const prepStatusLabels: Record<OrderPrepStatus, string> = {
  pending: "Pending",
  picked: "Picked",
  not_available: "Not Available",
};

export default function VendorOrderPrepare() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const nextOrder = await getVendorOrder(orderId);
      if (nextOrder.status === "Placed" || nextOrder.status === "Confirmed") {
        setOrder(await startPreparingOrder(orderId));
      } else {
        setOrder(nextOrder);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const items = order?.items ?? [];
  const checkedCount = items.filter(
    (item) => item.prepStatus === "picked" || item.prepStatus === "not_available",
  ).length;
  const progress = items.length ? Math.round((checkedCount / items.length) * 100) : 0;
  const allHandled = items.length > 0 && checkedCount === items.length;
  const hasUnavailable = items.some((item) => item.prepStatus === "not_available");
  const returnTo = order?.storeId ? `/vendor/stores/${order.storeId}/orders` : "/vendor";

  const customer = typeof order?.user === "object" ? order.user : null;
  const shipping = (order?.shippingAddress as any) ?? {};
  const addressSummary = useMemo(
    () =>
      [shipping.area, shipping.address, shipping.city, shipping.state]
        .filter(Boolean)
        .join(", "),
    [shipping.area, shipping.address, shipping.city, shipping.state],
  );

  if (!orderId) return <Navigate to="/vendor" replace />;

  const markItem = async (
    item: OrderItem,
    prepStatus: Extract<OrderPrepStatus, "picked" | "not_available">,
  ) => {
    const productId = String(item.product);
    setSavingItemId(productId);
    try {
      const nextOrder = await updateOrderItemPrepStatus(orderId, productId, prepStatus, {
        unavailableReason: reasons[productId] || item.unavailableReason || "",
      });
      setOrder(nextOrder);
      toast.success(prepStatus === "picked" ? "Item marked picked." : "Item marked unavailable.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update item");
    } finally {
      setSavingItemId(null);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const nextOrder = await completeOrderPreparation(orderId);
      setOrder(nextOrder);
      if (nextOrder.status === "Ready for Pickup") {
        toast.success("Order is ready for pickup.");
        navigate(returnTo);
      } else {
        toast.success("Order marked partially available.");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to complete preparation");
    } finally {
      setCompleting(false);
    }
  };

  const handleConfirmReady = async () => {
    setCompleting(true);
    try {
      await confirmReadyForPickup(orderId);
      toast.success("Order is ready for pickup.");
      navigate(returnTo);
    } catch (error: any) {
      toast.error(error?.message || "Failed to mark ready");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="-mx-4 sm:mx-0 pb-28 sm:pb-8">
      {loading ? (
        <Loading />
      ) : !order ? (
        <div className="bg-white rounded-2xl border border-app-border p-8 text-center">
          <p className="font-semibold text-zinc-900">Order not found.</p>
          <Link to="/vendor" className="text-app-green text-sm font-medium">
            Back to vendor dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <Link
            to={returnTo}
            className="mx-4 sm:mx-0 inline-flex items-center text-sm font-medium text-zinc-600 hover:text-app-green"
          >
            ← Back to orders
          </Link>

          <section className="mx-4 sm:mx-0 bg-white rounded-2xl border border-app-border p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-app-green">
                  Zembil Market store preparation
                </p>
                <h1 className="text-2xl font-semibold text-zinc-900 mt-1">
                  Order #{(order.id || order._id).slice(-8).toUpperCase()}
                </h1>
                <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm text-zinc-600">
                  <p>
                    <span className="font-medium text-zinc-900">Customer:</span>{" "}
                    {customer?.name || shipping.fullName || "—"}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-900">Phone:</span>{" "}
                    {shipping.phone || customer?.phone || "—"}
                  </p>
                  <p className="sm:col-span-2">
                    <span className="font-medium text-zinc-900">Address:</span>{" "}
                    {addressSummary || "—"}
                  </p>
                </div>
              </div>
              <span className={`self-start px-3 py-1.5 rounded-full text-xs font-semibold ${statusColors[order.status] || "bg-zinc-100 text-zinc-600"}`}>
                {order.status}
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-zinc-900">
                  {checkedCount} of {items.length} items checked
                </span>
                <span className="text-zinc-500">{progress}%</span>
              </div>
              <div className="h-3 bg-app-cream rounded-full overflow-hidden">
                <div
                  className="h-full bg-app-green transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-zinc-500">
                Pick each item in the order. Mark unavailable items before completing preparation.
              </p>
            </div>
          </section>

          <div className="mx-4 sm:mx-0 grid gap-4">
            {items.map((item) => {
              const status = item.prepStatus ?? "pending";
              const productId = String(item.product);
              const isSaving = savingItemId === productId;
              return (
                <article
                  key={productId}
                  className={`bg-white rounded-2xl border p-4 shadow-sm ${status === "picked" ? "border-green-200" : status === "not_available" ? "border-amber-200" : "border-app-border"}`}
                >
                  <div className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="size-24 sm:size-28 rounded-2xl object-cover bg-app-cream border border-app-border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h2 className="font-semibold text-zinc-900 text-lg">
                            {item.name}
                          </h2>
                          <p className="text-sm text-zinc-500">
                            {item.quantity} {item.unit} • {formatCurrency(item.price)} each
                          </p>
                        </div>
                        <span className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${prepStatusClasses[status]}`}>
                          {prepStatusLabels[status]}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => markItem(item, "picked")}
                          className="min-h-12 flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-100 disabled:opacity-60"
                        >
                          <CheckCircleIcon className="size-4" /> Picked
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => markItem(item, "not_available")}
                          className="min-h-12 flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 text-amber-800 text-sm font-semibold hover:bg-amber-100 disabled:opacity-60"
                        >
                          <XCircleIcon className="size-4" /> Not Available
                        </button>
                      </div>

                      {(status === "not_available" || reasons[productId]) && (
                        <label className="block mt-3 text-sm">
                          <span className="font-medium text-zinc-700">Reason</span>
                          <select
                            value={reasons[productId] ?? item.unavailableReason ?? ""}
                            onChange={(event) =>
                              setReasons((prev) => ({
                                ...prev,
                                [productId]: event.target.value,
                              }))
                            }
                            className="mt-1 w-full rounded-xl border border-app-border bg-white px-3 py-2 outline-none focus:border-app-green"
                          >
                            <option value="">Select a reason</option>
                            {UNAVAILABLE_REASONS.map((reason) => (
                              <option key={reason} value={reason}>
                                {reason}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {hasUnavailable && order.status !== "Ready for Pickup" && (
            <div className="mx-4 sm:mx-0 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3">
              <AlertTriangleIcon className="size-5 shrink-0" />
              <p>
                Some items are marked not available. The customer/order total may need review later.
              </p>
            </div>
          )}

          {order.status === "Partially Available" && (
            <div className="mx-4 sm:mx-0 bg-white rounded-2xl border border-app-border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-zinc-900">Review complete?</p>
                <p className="text-sm text-zinc-500">
                  Confirm when this partially available order is ready for delivery partner pickup.
                </p>
              </div>
              <button
                type="button"
                disabled={completing}
                onClick={handleConfirmReady}
                className="min-h-12 px-5 rounded-xl bg-app-green text-white font-semibold hover:bg-app-green/90 disabled:opacity-60"
              >
                Confirm Ready for Pickup
              </button>
            </div>
          )}

          {order.status !== "Ready for Pickup" && order.status !== "Cancelled" && (
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-app-border bg-white/95 backdrop-blur px-4 py-3 sm:sticky sm:rounded-2xl sm:border sm:shadow-sm sm:mx-0">
              <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-zinc-500 flex-1">
                  {allHandled
                    ? "All order items have been checked."
                    : "Complete button unlocks after every item is picked or marked unavailable."}
                </p>
                <button
                  type="button"
                  disabled={!allHandled || completing || order.status === "Partially Available"}
                  onClick={handleComplete}
                  className="min-h-12 px-5 rounded-xl bg-app-green text-white font-semibold hover:bg-app-green/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  <PackageCheckIcon className="size-4" />
                  {completing ? "Completing…" : "Complete Order Preparation"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
