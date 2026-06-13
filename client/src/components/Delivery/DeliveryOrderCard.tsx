import {
  CheckCircleIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PhoneIcon,
  StoreIcon,
  TruckIcon,
  XCircleIcon,
} from "lucide-react";
import type { Order } from "../../types";
import { statusColors } from "../../assets/assets";
import { formatCurrency } from "../../lib/format";

interface DeliveryOrderCardProps {
  order: Order;
  tab: "active" | "completed";
  onMarkPickedUp: (orderId: string) => void;
  onMarkOutForDelivery: (orderId: string) => void;
  setOtpModal: (orderId: string) => void;
  setCancelModal: (orderId: string) => void;
}

export default function DeliveryOrderCard({
  order,
  tab,
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
    !!store && !!store.lat && !!store.lng && !(store.lat === 0 && store.lng === 0);
  const hasDropPin =
    !!ship.lat && !!ship.lng && !(ship.lat === 0 && ship.lng === 0);

  const dropName = ship.fullName || user.name;
  const dropPhone = ship.phone || user.phone;
  const dropArea = ship.area || ship.state;
  const dropInstructions = ship.instructions || ship.address;

  return (
    <div
      key={order._id}
      className="bg-white rounded-2xl border border-app-border overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-app-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-zinc-500">
            #{order._id.slice(-6).toUpperCase()}
          </span>
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[order.status] || "bg-zinc-100 text-zinc-600"}`}
          >
            {order.status}
          </span>
        </div>
        <span className="text-sm font-semibold text-zinc-900">
          {formatCurrency(order.total)}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Pickup (from store) */}
        {store && (
          <div className="space-y-1.5 text-sm text-zinc-600">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-app-green">
              <StoreIcon className="size-3.5" /> Pickup
            </p>
            <p className="font-medium text-zinc-900">{store.name}</p>
            {store.phone && (
              <p className="flex items-center gap-1 text-xs text-zinc-500">
                <PhoneIcon className="size-3" /> {store.phone}
              </p>
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
                <ExternalLinkIcon className="size-3" /> Open pickup in Google Maps
              </a>
            )}
          </div>
        )}

        {/* Dropoff (to customer) */}
        <div className="space-y-1.5 text-sm text-zinc-600">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-app-green">
            <MapPinIcon className="size-3.5" /> Dropoff
          </p>
          {dropName && <p className="font-medium text-zinc-900">{dropName}</p>}
          {dropPhone && (
            <p className="flex items-center gap-1 text-xs text-zinc-500">
              <PhoneIcon className="size-3" /> {dropPhone}
            </p>
          )}
          {dropArea && <p className="text-sm">{dropArea}</p>}
          {dropInstructions && <p className="text-sm">{dropInstructions}</p>}
          {hasDropPin && (
            <a
              href={`https://www.google.com/maps?q=${ship.lat},${ship.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-app-green hover:underline"
            >
              <ExternalLinkIcon className="size-3" /> Open dropoff in Google Maps
            </a>
          )}
        </div>

        {/* Items count */}
        <p className="text-xs text-zinc-500">
          {order.items.length} item{order.items.length > 1 ? "s" : ""} •{" "}
          {order.paymentMethod.toUpperCase()}
        </p>
      </div>

      {/* Actions */}
      {tab === "active" && (
        <div className="px-5 py-3 border-t border-app-border flex flex-wrap gap-2">
          {order.status === "Ready for Pickup" && (
            <button
              onClick={() => onMarkPickedUp(order._id)}
              className="px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5"
            >
              <TruckIcon className="w-3.5 h-3.5" />
              Mark Picked Up
            </button>
          )}
          {order.status === "Picked Up" && (
            <button
              onClick={() => onMarkOutForDelivery(order._id)}
              className="px-4 py-2 text-sm font-medium bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5"
            >
              <TruckIcon className="w-3.5 h-3.5" />
              Out for Delivery
            </button>
          )}
          {!["Ready for Pickup", "Picked Up", "Out for Delivery", "Delivered", "Cancelled"].includes(order.status) && (
            <p className="px-3 py-2 rounded-xl bg-amber-50 text-amber-800 text-xs font-medium">
              {order.status === "Assigned"
                ? "Assigned — waiting for the store to mark this order Ready for Pickup."
                : "Store must mark this order Ready for Pickup before pickup."}
            </p>
          )}
          {order.status === "Out for Delivery" && (
            <button
              onClick={() => setOtpModal(order._id)}
              className="px-4 py-2 text-sm font-medium bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors flex items-center gap-1.5"
            >
              <CheckCircleIcon className="w-3.5 h-3.5" /> Mark Delivered
            </button>
          )}
          {order.status !== "Delivered" && order.status !== "Cancelled" && (
            <button
              onClick={() => setCancelModal(order._id)}
              className="px-4 py-2 text-sm font-medium bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1.5"
            >
              <XCircleIcon className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
      )}

      {tab === "completed" && (
        <div className="px-5 py-3 border-t border-app-border">
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            <ClockIcon className="size-3" />
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
