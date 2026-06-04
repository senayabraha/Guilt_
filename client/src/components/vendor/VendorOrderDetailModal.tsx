import {
  ExternalLinkIcon,
  MapPinIcon,
  PackageCheckIcon,
  PhoneIcon,
  XIcon,
} from "lucide-react";

import { statusColors } from "../../assets/assets";
import { formatCurrency } from "../../lib/format";
import type { Order, OrderItem } from "../../types";

interface Props {
  order: Order;
  actionLoading?: boolean;
  onClose: () => void;
  onPrepare: (order: Order) => void;
}

const prepColors: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-700",
  picked: "bg-green-100 text-green-700",
  not_available: "bg-red-100 text-red-700",
};

const formatStatus = (status?: string) =>
  status ? status.replace(/_/g, " ") : "pending";

const getUser = (order: Order) =>
  typeof order.user === "object" && order.user ? order.user : null;

const getAddressLine = (shippingAddress: any) => {
  const parts = [
    shippingAddress?.address,
    shippingAddress?.city,
    shippingAddress?.state,
    shippingAddress?.zip,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "No delivery address provided";
};

const getArea = (shippingAddress: any) =>
  shippingAddress?.area ||
  shippingAddress?.subCity ||
  shippingAddress?.sub_city ||
  shippingAddress?.subcity ||
  "—";

const googleMapsUrl = (shippingAddress: any) => {
  const lat = shippingAddress?.lat;
  const lng = shippingAddress?.lng;
  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
};

const actionLabel = (status: string) => {
  if (status === "Placed" || status === "Confirmed") return "Start Preparing";
  if (status === "Preparing") return "Continue Preparing";
  if (status === "Partially Available") return "Review & Mark Ready";
  if (status === "Ready for Pickup") return "Ready for Pickup";
  return null;
};

const VendorOrderDetailModal = ({
  order,
  actionLoading = false,
  onClose,
  onPrepare,
}: Props) => {
  const id = order.id || order._id;
  const shortId = id.slice(-6).toUpperCase();
  const user = getUser(order);
  const shippingAddress = order.shippingAddress as any;
  const mapsUrl = googleMapsUrl(shippingAddress);
  const label = actionLabel(order.status);
  const canPrepare =
    order.status === "Placed" ||
    order.status === "Confirmed" ||
    order.status === "Preparing" ||
    order.status === "Partially Available";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-end lg:items-center justify-center p-0 lg:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-order-detail-title"
    >
      <div
        className="bg-white w-full lg:max-w-4xl rounded-t-3xl lg:rounded-3xl overflow-hidden max-h-[94vh] flex flex-col shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-app-border flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-app-orange">
              Order #{shortId}
            </p>
            <h2
              id="vendor-order-detail-title"
              className="text-xl sm:text-2xl font-semibold text-zinc-900"
            >
              Order details
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[order.status] || "bg-zinc-100 text-zinc-600"}`}
              >
                {order.status}
              </span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
              {order.store?.name && <span>· {order.store.name}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-app-cream transition-colors shrink-0"
            aria-label="Close order details"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6 space-y-5">
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-app-border p-4 space-y-3">
              <h3 className="text-base font-semibold text-zinc-900">
                Customer
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-zinc-500">Name: </span>
                  <span className="font-medium text-zinc-900">{user?.name || "—"}</span>
                </p>
                <p className="flex items-center gap-2">
                  <PhoneIcon className="size-4 text-app-orange" />
                  <span className="font-medium text-zinc-900">{user?.phone || "—"}</span>
                </p>
                <p>
                  <span className="text-zinc-500">Email: </span>
                  <span className="font-medium text-zinc-900">{user?.email || "—"}</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-app-border p-4 space-y-3">
              <h3 className="text-base font-semibold text-zinc-900">
                Delivery address
              </h3>
              <div className="space-y-2 text-sm text-zinc-700">
                <p className="flex gap-2">
                  <MapPinIcon className="size-4 text-app-orange shrink-0 mt-0.5" />
                  <span>{getAddressLine(shippingAddress)}</span>
                </p>
                <p>
                  <span className="text-zinc-500">Area/Sub-city: </span>
                  <span className="font-medium text-zinc-900">{getArea(shippingAddress)}</span>
                </p>
                <p>
                  <span className="text-zinc-500">Instructions: </span>
                  <span className="font-medium text-zinc-900">
                    {shippingAddress?.instructions ||
                      shippingAddress?.deliveryInstructions ||
                      shippingAddress?.delivery_instructions ||
                      "—"}
                  </span>
                </p>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-app-cream text-app-green text-sm font-semibold hover:bg-app-cream/80"
                  >
                    Open dropoff in Google Maps
                    <ExternalLinkIcon className="size-4" />
                  </a>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-app-border overflow-hidden">
            <div className="px-4 py-3 bg-app-cream/60 border-b border-app-border flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900">
                Ordered items
              </h3>
              <span className="text-sm text-zinc-500">
                {order.items?.length || 0} items
              </span>
            </div>
            <div className="divide-y divide-app-border">
              {order.items.map((item: OrderItem, index) => (
                <div key={`${item.product}-${index}`} className="p-4 flex gap-3">
                  <div className="size-16 rounded-xl bg-app-cream overflow-hidden shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex-center text-zinc-400">
                        <PackageCheckIcon className="size-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-zinc-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-sm text-zinc-500">
                          Qty {item.quantity} {item.unit} · {formatCurrency(item.price)} each
                        </p>
                      </div>
                      <span
                        className={`self-start px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${prepColors[item.prepStatus || "pending"] || prepColors.pending}`}
                      >
                        {formatStatus(item.prepStatus)}
                      </span>
                    </div>
                    {item.unavailableReason && (
                      <p className="mt-2 text-sm text-red-600">
                        Reason unavailable: {item.unavailableReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-app-border p-4">
            <h3 className="text-base font-semibold text-zinc-900 mb-3">Totals</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Delivery fee</span>
                <span className="font-medium">{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Tax</span>
                <span className="font-medium">{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between border-t border-app-border pt-2 text-lg">
                <span className="font-semibold text-zinc-900">Total</span>
                <span className="font-semibold text-app-green">
                  {formatCurrency(order.total)}
                </span>
              </div>
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold capitalize">
                  Payment: {order.paymentMethod || "—"}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${order.isPaid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {order.isPaid ? "Paid" : "Unpaid"}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-app-border flex flex-col sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl border border-app-border text-zinc-700 font-semibold hover:bg-zinc-50"
          >
            Close
          </button>
          {label && (
            <button
              type="button"
              onClick={() => onPrepare(order)}
              disabled={!canPrepare || actionLoading}
              className={`px-5 py-3 rounded-xl font-semibold ${canPrepare ? "bg-app-green text-white hover:bg-app-green/90" : "bg-green-100 text-green-700 cursor-not-allowed"} disabled:opacity-60`}
            >
              {actionLoading ? "Opening…" : label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorOrderDetailModal;
