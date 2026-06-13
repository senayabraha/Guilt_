import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PhoneIcon,
  StoreIcon,
  TruckIcon,
} from "lucide-react";
import type { Order } from "../../types";
import { statusColors } from "../../assets/assets";
import { formatCurrency } from "../../lib/format";

const STATUS_CONTEXT: Record<
  string,
  { bg: string; text: string; message: string }
> = {
  Assigned: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    message: "Waiting for the store to prepare this order.",
  },
  "Ready for Pickup": {
    bg: "bg-blue-50",
    text: "text-blue-800",
    message: "Order is ready — head to the store for pickup.",
  },
  "Picked Up": {
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    message: "You have the order. Start delivery when ready.",
  },
  "Out for Delivery": {
    bg: "bg-green-50",
    text: "text-green-800",
    message: "Get the OTP from the customer to complete this delivery.",
  },
};

interface DeliveryOrderCardProps {
  order: Order;
  tab: "active" | "completed";
  isPriority?: boolean;
  onMarkPickedUp: (orderId: string) => void;
  onMarkOutForDelivery: (orderId: string) => void;
  setOtpModal: (orderId: string) => void;
  setCancelModal: (orderId: string) => void;
}

export default function DeliveryOrderCard({
  order,
  tab,
  isPriority,
  onMarkPickedUp,
  onMarkOutForDelivery,
  setOtpModal,
  setCancelModal,
}: DeliveryOrderCardProps) {
  const user =
    typeof order.user === "object"
      ? order.user
      : { name: "Customer", email: "", phone: "" };

  const store = order.store;
  const ship = (order.shippingAddress as any) || {};

  const hasStorePin =
    !!store &&
    !!store.lat &&
    !!store.lng &&
    !(store.lat === 0 && store.lng === 0);
  const hasDropPin =
    !!ship.lat && !!ship.lng && !(ship.lat === 0 && ship.lng === 0);

  const dropName = ship.fullName || user.name;
  const dropPhone = ship.phone || (user as any).phone;
  const dropArea = ship.area || ship.state;
  const dropInstructions = ship.instructions || ship.address;

  const orderId = order.id || order._id;
  const context = STATUS_CONTEXT[order.status];

  return (
    <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
      {/* Priority stripe — top card only */}
      {isPriority && tab === "active" && (
        <div className="h-1 bg-app-green" />
      )}

      {/* Header */}
      <div className="px-5 py-4 border-b border-app-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-mono text-zinc-400">
            #{order._id.slice(-6).toUpperCase()}
          </span>
          <span
            className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusColors[order.status] || "bg-zinc-100 text-zinc-600"}`}
          >
            {order.status}
          </span>
        </div>
        <span className="text-sm font-semibold text-zinc-900">
          {formatCurrency(order.total)}
        </span>
      </div>

      {/* Status context banner */}
      {tab === "active" && context && (
        <div
          className={`px-5 py-2.5 text-xs font-medium ${context.bg} ${context.text}`}
        >
          {context.message}
        </div>
      )}

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Pickup */}
        {store && (
          <div className="space-y-1.5 text-sm text-zinc-600">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-app-green">
              <StoreIcon className="size-3.5" /> Pickup
            </p>
            <p className="font-medium text-zinc-900">{store.name}</p>
            {store.phone && (
              <a
                href={`tel:${store.phone}`}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-app-green"
              >
                <PhoneIcon className="size-3" /> {store.phone}
              </a>
            )}
            {(store.state || store.city) && (
              <p className="text-sm">
                {store.state}
                {store.state && store.city ? ", " : ""}
                {store.city}
              </p>
            )}
            {store.address && <p className="text-sm">{store.address}</p>}
            {hasStorePin && (
              <a
                href={`https://www.google.com/maps?q=${store.lat},${store.lng}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-app-green hover:underline"
              >
                <ExternalLinkIcon className="size-3" /> Open in Google Maps
              </a>
            )}
          </div>
        )}

        {/* Dashed divider between pickup and dropoff */}
        {store && <div className="border-t border-dashed border-app-border" />}

        {/* Dropoff */}
        <div className="space-y-1.5 text-sm text-zinc-600">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-app-green">
            <MapPinIcon className="size-3.5" /> Dropoff
          </p>
          {dropName && (
            <p className="font-medium text-zinc-900">{dropName}</p>
          )}
          {dropPhone && (
            <a
              href={`tel:${dropPhone}`}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-app-green"
            >
              <PhoneIcon className="size-3" /> {dropPhone}
            </a>
          )}
          {dropArea && <p className="text-sm">{dropArea}</p>}
          {dropInstructions && (
            <p className="text-sm">{dropInstructions}</p>
          )}
          {hasDropPin && (
            <a
              href={`https://www.google.com/maps?q=${ship.lat},${ship.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-app-green hover:underline"
            >
              <ExternalLinkIcon className="size-3" /> Open in Google Maps
            </a>
          )}
        </div>

        {/* Order meta */}
        <p className="text-xs text-zinc-400">
          {order.items.length} item{order.items.length !== 1 ? "s" : ""} •{" "}
          {order.paymentMethod.toUpperCase()}
        </p>
      </div>

      {/* Active actions */}
      {tab === "active" && (
        <div className="border-t border-app-border">
          {/* Primary action */}
          {(order.status === "Ready for Pickup" ||
            order.status === "Picked Up" ||
            order.status === "Out for Delivery") && (
            <div className="px-5 py-3">
              {order.status === "Ready for Pickup" && (
                <button
                  onClick={() => onMarkPickedUp(orderId)}
                  className="w-full py-3 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <TruckIcon className="size-4" />
                  Confirm Pickup
                </button>
              )}
              {order.status === "Picked Up" && (
                <button
                  onClick={() => onMarkOutForDelivery(orderId)}
                  className="w-full py-3 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <TruckIcon className="size-4" />
                  Start Delivery
                </button>
              )}
              {order.status === "Out for Delivery" && (
                <button
                  onClick={() => setOtpModal(orderId)}
                  className="w-full py-3 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="size-4" />
                  Enter OTP & Complete
                </button>
              )}
            </div>
          )}

          {/* Cancel zone — separated with dashed divider */}
          {!["Delivered", "Cancelled"].includes(order.status) && (
            <div
              className={`px-5 pb-3 ${
                order.status === "Ready for Pickup" ||
                order.status === "Picked Up" ||
                order.status === "Out for Delivery"
                  ? "border-t border-dashed border-app-border pt-3"
                  : "pt-3"
              }`}
            >
              <button
                onClick={() => setCancelModal(orderId)}
                className="w-full py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <AlertTriangleIcon className="size-3.5" />
                Report Issue / Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Completed footer */}
      {tab === "completed" && (
        <div className="px-5 py-3 border-t border-app-border flex items-center justify-between">
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            <ClockIcon className="size-3" />
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              order.status === "Delivered"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {order.status}
          </span>
        </div>
      )}
    </div>
  );
}
