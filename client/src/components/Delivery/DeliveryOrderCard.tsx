import { ClockIcon, MapPinIcon, PackageIcon, StoreIcon } from "lucide-react";
import { Link } from "react-router-dom";
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
}

export default function DeliveryOrderCard({
  order,
  tab,
  isPriority,
}: DeliveryOrderCardProps) {
  const store = order.store;
  const ship = (order.shippingAddress as any) || {};
  const dropArea = ship.area || ship.state;
  const orderId = order.id || order._id;
  const context = STATUS_CONTEXT[order.status];

  const inner = (
    <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
      {/* Priority stripe */}
      {isPriority && tab === "active" && <div className="h-1 bg-app-green" />}

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

      {/* Route summary */}
      <div className="px-5 py-4 space-y-2.5">
        {store && (
          <div className="flex items-center gap-2 text-sm text-zinc-700">
            <StoreIcon className="size-3.5 text-app-green shrink-0" />
            <span className="font-medium truncate">{store.name}</span>
          </div>
        )}
        {store && dropArea && (
          <div className="ml-3.5 w-px h-3 border-l-2 border-dashed border-zinc-200" />
        )}
        {dropArea && (
          <div className="flex items-center gap-2 text-sm text-zinc-700">
            <MapPinIcon className="size-3.5 text-blue-500 shrink-0" />
            <span className="truncate">{dropArea}</span>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-1.5 pt-1">
          <PackageIcon className="size-3 text-zinc-400 shrink-0" />
          <span className="text-xs text-zinc-400">
            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
          </span>
          <span className="text-zinc-300">·</span>
          <span className="text-xs text-zinc-400">
            {order.paymentMethod.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Footer */}
      {tab === "active" ? (
        <div className="px-5 py-3 border-t border-app-border bg-zinc-50/60 flex items-center justify-end">
          <span className="text-xs font-semibold text-app-green">
            View Details →
          </span>
        </div>
      ) : (
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
                : order.status === "Failed Delivery"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {order.status}
          </span>
        </div>
      )}
    </div>
  );

  if (tab === "active") {
    return (
      <Link to={`/delivery/orders/${orderId}`} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}
