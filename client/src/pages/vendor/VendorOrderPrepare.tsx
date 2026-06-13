import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  PackageCheckIcon,
  TruckIcon,
  UserIcon,
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
import {
  assignStoreDriverToOrder,
  getStoreOwnedDrivers,
  requestMarketplaceDriver,
} from "../../lib/db/deliveryPartners";
import type { DeliveryPartner, Order, OrderItem, OrderPrepStatus } from "../../types";
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
  picked: "Picked ✓",
  not_available: "Not Available",
};

export default function VendorOrderPrepare() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Dispatch state
  const [dispatching, setDispatching] = useState(false);
  const [marketplaceRequestPending, setMarketplaceRequestPending] = useState(false);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [storeDrivers, setStoreDrivers] = useState<DeliveryPartner[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

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
  const pickedCount = items.filter((i) => i.prepStatus === "picked").length;
  const unavailableCount = items.filter((i) => i.prepStatus === "not_available").length;
  const checkedCount = pickedCount + unavailableCount;
  const progress = items.length ? Math.round((checkedCount / items.length) * 100) : 0;
  const allHandled = items.length > 0 && checkedCount === items.length;

  // Items marked unavailable that still have no reason saved.
  const missingReasonCount = items.filter(
    (i) => i.prepStatus === "not_available" && !i.unavailableReason,
  ).length;

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
    reason?: string,
  ) => {
    if (!orderId) return;
    const productId = String(item.product);
    setSavingItemId(productId);
    try {
      const nextOrder = await updateOrderItemPrepStatus(orderId, productId, prepStatus, {
        unavailableReason: reason ?? item.unavailableReason ?? "",
      });
      setOrder(nextOrder);
      toast.success(prepStatus === "picked" ? "Item marked picked." : "Item marked unavailable.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update item");
    } finally {
      setSavingItemId(null);
    }
  };

  // Auto-save reason when dropdown changes (item already marked not_available).
  const handleReasonChange = async (item: OrderItem, newReason: string) => {
    if (!orderId) return;
    const productId = String(item.product);
    if (item.prepStatus !== "not_available") return;
    setSavingItemId(productId);
    try {
      const nextOrder = await updateOrderItemPrepStatus(orderId, productId, "not_available", {
        unavailableReason: newReason,
      });
      setOrder(nextOrder);
    } catch {
      // silent — reason will be prompted again on complete
    } finally {
      setSavingItemId(null);
    }
  };

  const handleComplete = async () => {
    if (missingReasonCount > 0) {
      toast.error(
        `Please select a reason for the ${missingReasonCount} unavailable item${missingReasonCount !== 1 ? "s" : ""}.`,
      );
      return;
    }
    setCompleting(true);
    try {
      const nextOrder = await completeOrderPreparation(orderId!);
      setOrder(nextOrder);
      if (nextOrder.status === "Ready for Pickup") {
        toast.success("Order is ready for pickup!");
        navigate(returnTo);
      } else {
        toast.success("Order marked partially available — confirm when ready.");
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
      await confirmReadyForPickup(orderId!);
      toast.success("Order is ready for pickup!");
      navigate(returnTo);
    } catch (error: any) {
      toast.error(error?.message || "Failed to mark ready");
    } finally {
      setCompleting(false);
    }
  };

  const handleRequestMarketplaceDriver = async () => {
    if (!orderId) return;
    setDispatching(true);
    try {
      await requestMarketplaceDriver(orderId);
      setMarketplaceRequestPending(true);
      toast.success("Delivery request broadcast to marketplace drivers.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to request a driver");
    } finally {
      setDispatching(false);
    }
  };

  const handleOpenDriverPicker = async () => {
    if (!order?.storeId) return;
    setShowDriverPicker(true);
    setLoadingDrivers(true);
    try {
      setStoreDrivers(await getStoreOwnedDrivers(order.storeId));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load drivers");
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleAssignStoreDriver = async (driverId: string) => {
    if (!orderId) return;
    setDispatching(true);
    try {
      await assignStoreDriverToOrder(orderId, driverId);
      toast.success("Driver assigned successfully.");
      setShowDriverPicker(false);
      await loadOrder();
    } catch (error: any) {
      toast.error(error?.message || "Failed to assign driver");
    } finally {
      setDispatching(false);
    }
  };

  const isPartiallyAvailable = order?.status === "Partially Available";
  const isReadyOrCancelled =
    order?.status === "Ready for Pickup" ||
    order?.status === "Assigned" ||
    order?.status === "Cancelled";

  return (
    <div className="-mx-4 sm:mx-0 pb-28 sm:pb-8">
      {loading ? (
        <Loading />
      ) : !order ? (
        <div className="bg-white rounded-2xl border border-app-border p-8 text-center space-y-3">
          <p className="font-semibold text-zinc-900">Order not found.</p>
          <Link to="/vendor" className="text-app-green text-sm font-medium">
            Back to vendor dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          <Link
            to={returnTo}
            className="mx-4 sm:mx-0 inline-flex items-center gap-1.5 text-sm font-medium text-app-text-light hover:text-app-green transition-colors"
          >
            ← Back to orders
          </Link>

          {/* Order header */}
          <section className="mx-4 sm:mx-0 bg-white rounded-2xl border border-app-border p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-app-green">
                  Zembil Market — order preparation
                </p>
                <h1 className="text-2xl font-semibold text-zinc-900 mt-1">
                  Order #{(order.id || order._id).slice(-8).toUpperCase()}
                </h1>
                <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-zinc-600">
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
              <span
                className={`self-start px-3 py-1.5 rounded-full text-xs font-semibold ${statusColors[order.status] || "bg-zinc-100 text-zinc-600"}`}
              >
                {order.status}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-zinc-900">
                  {checkedCount} of {items.length} items handled
                </span>
                <span className="text-zinc-500">{progress}%</span>
              </div>
              <div className="h-3 bg-app-cream rounded-full overflow-hidden">
                <div
                  className="h-full bg-app-green transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {checkedCount < items.length ? (
                <p className="mt-2 text-xs text-app-text-light">
                  Mark each item as <strong>Picked</strong> or{" "}
                  <strong>Not Available</strong>. All items must be handled before
                  you can complete.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
                  {pickedCount > 0 && (
                    <span className="flex items-center gap-1 text-green-700">
                      <CheckCircleIcon className="size-3.5" />
                      {pickedCount} picked
                    </span>
                  )}
                  {unavailableCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-700">
                      <XCircleIcon className="size-3.5" />
                      {unavailableCount} unavailable
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Partial availability explanation */}
          {isPartiallyAvailable && (
            <div className="mx-4 sm:mx-0 rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <p className="font-semibold text-amber-900 flex items-center gap-2">
                <AlertTriangleIcon className="size-4 shrink-0" />
                Order partially available
              </p>
              <p className="text-sm text-amber-800">
                {unavailableCount} item{unavailableCount !== 1 ? "s are" : " is"} unavailable.
                The customer will receive the available items. There is no automatic refund —
                if a refund or substitution is needed, contact Zembil Market support after
                delivery.
              </p>
              <p className="text-sm text-amber-800">
                When you have packed the available items and they are ready for collection,
                tap <strong>Confirm Ready for Pickup</strong> below.
              </p>
            </div>
          )}

          {/* Unavailable-items reminder (while still preparing) */}
          {!isPartiallyAvailable && unavailableCount > 0 && !isReadyOrCancelled && (
            <div className="mx-4 sm:mx-0 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3 text-sm text-amber-900">
              <AlertTriangleIcon className="size-4 shrink-0 mt-0.5" />
              <p>
                {unavailableCount} item{unavailableCount !== 1 ? "s are" : " is"} marked
                unavailable. Select a reason for each before completing.
              </p>
            </div>
          )}

          {/* No-refund notice */}
          {!isReadyOrCancelled && (
            <div className="mx-4 sm:mx-0 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 flex gap-2 text-xs text-zinc-600">
              <InfoIcon className="size-3.5 shrink-0 mt-0.5" />
              <p>
                Refunds and substitutions are handled manually. If any item is
                unavailable, note the reason so support can assist the customer.
              </p>
            </div>
          )}

          {/* Item cards */}
          <div className="mx-4 sm:mx-0 grid gap-4">
            {items.map((item) => {
              const status = item.prepStatus ?? "pending";
              const productId = String(item.product);
              const isSaving = savingItemId === productId;
              return (
                <article
                  key={productId}
                  className={`bg-white rounded-2xl border p-4 shadow-sm transition-colors ${
                    status === "picked"
                      ? "border-green-200 bg-green-50/30"
                      : status === "not_available"
                        ? "border-amber-200 bg-amber-50/30"
                        : "border-app-border"
                  }`}
                >
                  <div className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="size-20 sm:size-24 rounded-xl object-cover bg-app-cream border border-app-border shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h2 className="font-semibold text-zinc-900 text-base leading-snug">
                            {item.name}
                          </h2>
                          <p className="text-sm text-zinc-500 mt-0.5">
                            {item.quantity} {item.unit} ·{" "}
                            {formatCurrency(item.price)} each
                          </p>
                        </div>
                        <span
                          className={`self-start px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${prepStatusClasses[status]}`}
                        >
                          {prepStatusLabels[status]}
                        </span>
                      </div>

                      {/* Action buttons — hidden once item is fully handled */}
                      {status !== "picked" && (
                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => markItem(item, "picked")}
                            className="min-h-11 flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
                          >
                            <CheckCircleIcon className="size-4" />
                            {status === "not_available" ? "Actually Picked" : "Mark Picked"}
                          </button>
                          {status !== "not_available" && (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => markItem(item, "not_available")}
                              className="min-h-11 flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60 transition-colors"
                            >
                              <XCircleIcon className="size-4" />
                              Not Available
                            </button>
                          )}
                        </div>
                      )}

                      {/* Picked: show a re-open option */}
                      {status === "picked" && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => markItem(item, "not_available")}
                          className="mt-3 text-xs text-zinc-400 hover:text-amber-600 transition-colors"
                        >
                          Undo — mark not available instead
                        </button>
                      )}

                      {/* Reason dropdown — shown when not_available */}
                      {status === "not_available" && (
                        <label className="block mt-3 text-sm">
                          <span className="font-medium text-zinc-700">
                            Reason{" "}
                            {!item.unavailableReason && (
                              <span className="text-red-500">*</span>
                            )}
                          </span>
                          <select
                            value={item.unavailableReason ?? ""}
                            disabled={isSaving}
                            onChange={(e) => handleReasonChange(item, e.target.value)}
                            className={`mt-1 w-full rounded-xl border bg-white px-3 py-2.5 outline-none focus:ring-1 text-sm transition-colors ${
                              !item.unavailableReason
                                ? "border-amber-400 focus:border-amber-500 focus:ring-amber-300"
                                : "border-app-border focus:border-app-green focus:ring-app-green"
                            }`}
                          >
                            <option value="">Select a reason…</option>
                            {UNAVAILABLE_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          {!item.unavailableReason && (
                            <p className="mt-1 text-xs text-amber-600">
                              Required before completing preparation.
                            </p>
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Sticky footer CTA */}
          {!isReadyOrCancelled && (
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-app-border bg-white/95 backdrop-blur px-4 py-3 sm:sticky sm:rounded-2xl sm:border sm:shadow-sm sm:mx-0">
              <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-zinc-500 flex-1">
                  {isPartiallyAvailable
                    ? `${pickedCount} picked · ${unavailableCount} unavailable — confirm when packed and ready.`
                    : allHandled
                      ? missingReasonCount > 0
                        ? `Add reason for ${missingReasonCount} unavailable item${missingReasonCount !== 1 ? "s" : ""} to continue.`
                        : "All items handled — ready to complete preparation."
                      : `${checkedCount} of ${items.length} items handled.`}
                </p>

                {isPartiallyAvailable ? (
                  <button
                    type="button"
                    disabled={completing}
                    onClick={handleConfirmReady}
                    className="min-h-12 px-6 rounded-xl bg-app-green text-white font-semibold hover:bg-app-green/90 disabled:opacity-60 inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <PackageCheckIcon className="size-4" />
                    {completing ? "Confirming…" : "Confirm Ready for Pickup"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!allHandled || completing || missingReasonCount > 0}
                    onClick={handleComplete}
                    className="min-h-12 px-6 rounded-xl bg-app-green text-white font-semibold hover:bg-app-green/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <PackageCheckIcon className="size-4" />
                    {completing ? "Completing…" : "Complete Preparation"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Ready / dispatch state */}
          {(order.status === "Ready for Pickup" || order.status === "Assigned") && (
            <div className="mx-4 sm:mx-0 space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4">
                <CheckCircleIcon className="size-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-900">
                    {order.status === "Assigned" ? "Driver assigned" : "Ready for pickup"}
                  </p>
                  <p className="text-sm text-green-700 mt-0.5">
                    {order.status === "Assigned"
                      ? "A delivery partner is on their way to collect this order."
                      : "Order is packed and awaiting a delivery partner."}
                  </p>
                </div>
              </div>

              {/* Driver dispatch panel — only when Ready for Pickup */}
              {order.status === "Ready for Pickup" && (
                order.deliveryPartner ? (
                  <div className="bg-white border border-app-border rounded-2xl p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">
                      Assigned driver
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-app-green flex items-center justify-center shrink-0">
                        <span className="text-white font-semibold">
                          {order.deliveryPartner.name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900">{order.deliveryPartner.name}</p>
                        <p className="text-xs text-zinc-500 capitalize">
                          {order.deliveryPartner.vehicleType} · {order.deliveryPartner.phone}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : marketplaceRequestPending ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center gap-3">
                    <div className="size-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    <div>
                      <p className="font-semibold text-blue-900">Searching for a driver…</p>
                      <p className="text-sm text-blue-700 mt-0.5">
                        Request sent to the marketplace pool. A driver will accept shortly.
                      </p>
                    </div>
                  </div>
                ) : showDriverPicker ? (
                  <div className="bg-white border border-app-border rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-app-border flex items-center justify-between">
                      <p className="font-semibold text-zinc-900 text-sm">Select a store driver</p>
                      <button
                        type="button"
                        onClick={() => setShowDriverPicker(false)}
                        className="text-xs text-zinc-400 hover:text-zinc-600"
                      >
                        Cancel
                      </button>
                    </div>
                    {loadingDrivers ? (
                      <div className="p-5 text-sm text-zinc-500">Loading available drivers…</div>
                    ) : storeDrivers.length === 0 ? (
                      <div className="p-5 text-sm text-zinc-500">
                        No active store drivers are currently online.
                      </div>
                    ) : (
                      <div className="divide-y divide-app-border">
                        {storeDrivers.map((driver) => (
                          <button
                            key={driver.id || driver._id}
                            type="button"
                            disabled={dispatching}
                            onClick={() => handleAssignStoreDriver(driver.id || driver._id)}
                            className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-zinc-50 text-left disabled:opacity-60 transition-colors"
                          >
                            <div className="size-9 rounded-full bg-app-green flex items-center justify-center shrink-0">
                              <span className="text-white text-sm font-semibold">
                                {driver.name[0]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-zinc-900 text-sm">{driver.name}</p>
                              <p className="text-xs text-zinc-500 capitalize">
                                {driver.vehicleType} · {driver.phone}
                              </p>
                            </div>
                            <span
                              className={`size-2 rounded-full shrink-0 ${
                                driver.availabilityStatus === "online"
                                  ? "bg-green-500"
                                  : "bg-amber-400"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white border border-app-border rounded-2xl p-5">
                    <p className="text-sm font-semibold text-zinc-900 mb-3">Assign delivery</p>
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={dispatching}
                        onClick={handleRequestMarketplaceDriver}
                        className="w-full px-4 py-3.5 rounded-xl bg-app-green text-white text-sm font-semibold hover:bg-app-green/90 disabled:opacity-60 text-left flex items-start gap-3"
                      >
                        <TruckIcon className="size-4 shrink-0 mt-0.5" />
                        <div>
                          <p>Request Marketplace Driver</p>
                          <p className="text-xs font-normal opacity-80 mt-0.5">
                            Broadcast to available drivers in the marketplace pool
                          </p>
                        </div>
                      </button>
                      {order.store?.selfDeliveryEnabled && (
                        <button
                          type="button"
                          disabled={dispatching}
                          onClick={handleOpenDriverPicker}
                          className="w-full px-4 py-3.5 rounded-xl border border-app-border text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 text-left flex items-start gap-3"
                        >
                          <UserIcon className="size-4 shrink-0 mt-0.5" />
                          <div>
                            <p>Assign Store Driver</p>
                            <p className="text-xs font-normal text-zinc-400 mt-0.5">
                              Directly assign one of your store's own delivery drivers
                            </p>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
