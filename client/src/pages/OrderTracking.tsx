import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  BanknoteIcon,
  InfoIcon,
  MapPinIcon,
  PhoneIcon,
  StoreIcon,
} from "lucide-react";

import type { Order } from "../types";
import Loading from "../components/Loading";
import OrderOTP from "../components/OrderTracking/OrderOTP";
import LiveMap from "../components/OrderTracking/LiveMap";
import OrderTimeLine from "../components/OrderTracking/OrderTimeLine";
import { statusColors } from "../assets/assets";
import { getOrder, getOrderLocation } from "../lib/db/orders";
import { useOrderRealtime } from "../hooks/useOrderRealtime";
import { formatCurrency } from "../lib/format";

// Human-readable context for each order status shown to the customer.
const STATUS_CONTEXT: Record<string, { headline: string; desc: string }> = {
  Placed: {
    headline: "Order received",
    desc: "Your order has been sent to the store. They will confirm it shortly.",
  },
  Confirmed: {
    headline: "Order confirmed",
    desc: "The store confirmed your order and will begin preparing it soon.",
  },
  Preparing: {
    headline: "Being prepared",
    desc: "The store is picking and packing your items right now.",
  },
  "Partially Available": {
    headline: "Partially available",
    desc: "Some items were unavailable. The store is preparing the available items for delivery.",
  },
  "Ready for Pickup": {
    headline: "Awaiting pickup",
    desc: "Your order is packed and waiting for a delivery partner to collect it.",
  },
  Assigned: {
    headline: "Delivery partner assigned",
    desc: "A delivery partner has been assigned and will collect your order soon.",
  },
  Packed: {
    headline: "Order packed",
    desc: "Your order is packed and ready for collection.",
  },
  "Picked Up": {
    headline: "Order collected",
    desc: "Your delivery partner has picked up your order.",
  },
  "Out for Delivery": {
    headline: "On the way!",
    desc: "Your order is out for delivery. Have your OTP ready when it arrives.",
  },
  Delivered: {
    headline: "Delivered!",
    desc: "Your order has been delivered successfully. Enjoy!",
  },
  Cancelled: {
    headline: "Order cancelled",
    desc: "This order has been cancelled. Contact the store if you need assistance.",
  },
};

// Background colours for the status context banner.
const STATUS_BANNER: Record<string, string> = {
  Placed: "bg-blue-50 border-blue-200",
  Confirmed: "bg-indigo-50 border-indigo-200",
  Preparing: "bg-purple-50 border-purple-200",
  "Partially Available": "bg-amber-50 border-amber-200",
  "Ready for Pickup": "bg-green-50 border-green-200",
  Assigned: "bg-blue-50 border-blue-200",
  Packed: "bg-purple-50 border-purple-200",
  "Picked Up": "bg-blue-50 border-blue-200",
  "Out for Delivery": "bg-orange-50 border-orange-100",
  Delivered: "bg-green-50 border-green-200",
  Cancelled: "bg-red-50 border-red-200",
};

// Statuses where live-location polling is unnecessary.
const NO_LIVE_STATUSES = new Set([
  "Placed", "Confirmed", "Preparing", "Ready for Pickup",
  "Delivered", "Cancelled",
]);

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveLocation, setLiveLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    getOrder(id)
      .then((o) => {
        if (!o) navigate("/orders");
        else setOrder(o);
      })
      .catch(() => navigate("/orders"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // Realtime: order status changes pushed from the server → silent refresh.
  useOrderRealtime(id, async () => {
    if (!id) return;
    try {
      const fresh = await getOrder(id);
      if (fresh) setOrder(fresh);
    } catch {}
  });

  // Poll live location every 10 s during active delivery phases.
  useEffect(() => {
    if (!order || NO_LIVE_STATUSES.has(order.status)) return;

    const fetchLocation = async () => {
      try {
        if (!id) return;
        const data = await getOrderLocation(id);
        if (!data) return;
        if (data.liveLocation?.lat && data.liveLocation?.lng && data.liveLocation.updatedAt) {
          setLiveLocation({ lat: data.liveLocation.lat, lng: data.liveLocation.lng });
        }
        if (data.status && data.status !== order.status) {
          setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
        }
      } catch {}
    };
    fetchLocation();
    const interval = setInterval(fetchLocation, 10_000);
    return () => clearInterval(interval);
  }, [id, order?.status]);

  if (loading) return <Loading />;
  if (!order) return null;

  const orderId = order.id || order._id;
  const shipping = order.shippingAddress as any;
  const ctx = STATUS_CONTEXT[order.status];
  const bannerClass = STATUS_BANNER[order.status] ?? "bg-zinc-50 border-zinc-200";
  const isTerminal = order.status === "Delivered" || order.status === "Cancelled";
  const store = order.store;

  return (
    <div className="min-h-screen mb-20 bg-app-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate("/orders")}
          className="inline-flex items-center gap-2 text-sm text-app-text-light hover:text-app-green transition-colors"
        >
          <ArrowLeftIcon className="size-4" /> Back to Orders
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Order #{orderId.slice(-8).toUpperCase()}
            </h1>
            <p className="text-sm text-app-text-light mt-1">
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {" · "}
              {new Date(order.createdAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <span
            className={`self-start px-4 py-1.5 text-sm font-semibold rounded-full ${statusColors[order.status] ?? "bg-zinc-100 text-zinc-600"}`}
          >
            {order.status}
          </span>
        </div>

        {/* Status context banner */}
        {ctx && (
          <div className={`rounded-2xl p-4 border ${bannerClass}`}>
            <p className="font-semibold text-zinc-900 text-sm">{ctx.headline}</p>
            <p className="text-sm text-zinc-600 mt-0.5">{ctx.desc}</p>
            {order.status === "Partially Available" && (
              <p className="mt-2 text-xs text-amber-700 font-medium">
                You will receive the items that were available. For any unavailable items, the store or Zembil Market support will contact you.
              </p>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left — live tracking + timeline */}
          <div className="lg:col-span-2 space-y-5">
            <OrderOTP order={order} />
            <LiveMap order={order} liveLocation={liveLocation} />
            <OrderTimeLine order={order} />

            {/* Delivery partner */}
            {order.deliveryPartner && !isTerminal && (
              <div className="bg-white rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-app-green flex items-center justify-center shrink-0">
                    <span className="text-white font-semibold text-base">
                      {order.deliveryPartner.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {order.deliveryPartner.name}
                    </p>
                    <p className="text-xs text-app-text-light capitalize">
                      {order.deliveryPartner.vehicleType} · Delivery Partner
                    </p>
                  </div>
                </div>
                <a
                  href={`tel:${order.deliveryPartner.phone}`}
                  className="p-2.5 bg-app-cream rounded-xl hover:bg-app-cream/70 transition-colors"
                  aria-label="Call delivery partner"
                >
                  <PhoneIcon className="size-4 text-app-green" />
                </a>
              </div>
            )}
          </div>

          {/* Right — order details */}
          <div className="space-y-4">
            {/* Store */}
            {store && (
              <div className="bg-white rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                  <StoreIcon className="size-4 text-app-green" />
                  Store
                </h3>
                <div className="flex items-center gap-3">
                  {store.logo ? (
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="size-10 rounded-xl object-cover border border-app-border shrink-0"
                    />
                  ) : (
                    <div className="size-10 rounded-xl bg-app-cream flex items-center justify-center shrink-0">
                      <StoreIcon className="size-5 text-app-green" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">
                      {store.name}
                    </p>
                    {store.phone && (
                      <a
                        href={`tel:${store.phone}`}
                        className="text-xs text-app-green flex items-center gap-1 mt-0.5 hover:text-app-green/80 transition-colors"
                      >
                        <PhoneIcon className="size-3" />
                        {store.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Delivery address */}
            <div className="bg-white rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                <MapPinIcon className="size-4 text-app-green" />
                Delivery Address
              </h3>
              <div className="text-sm text-zinc-600 space-y-1 leading-relaxed">
                {shipping.label && (
                  <p className="font-medium text-zinc-800">{shipping.label}</p>
                )}
                {(shipping.area || shipping.state) && (
                  <p>{shipping.area || shipping.state}</p>
                )}
                {shipping.address && <p>{shipping.address}</p>}
                {shipping.city && <p>{shipping.city}</p>}
                {shipping.phone && (
                  <p className="flex items-center gap-1.5 mt-2 text-zinc-500 text-xs">
                    <PhoneIcon className="size-3" />
                    {shipping.phone}
                  </p>
                )}
                {shipping.instructions && (
                  <p className="mt-2 text-xs italic text-zinc-400">
                    "{shipping.instructions}"
                  </p>
                )}
              </div>
            </div>

            {/* Items + totals */}
            <div className="bg-white rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">
                Items ({order.items.length})
              </h3>
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="size-10 rounded-lg object-cover border border-app-border shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-app-text-light">
                        {item.quantity} {item.unit}
                        {item.prepStatus === "not_available" && (
                          <span className="ml-1.5 text-red-500 font-medium">
                            · unavailable
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ${item.prepStatus === "not_available" ? "line-through text-zinc-400" : "text-zinc-900"}`}
                    >
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-app-border space-y-2 text-sm">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Delivery</span>
                  <span>
                    {order.deliveryFee === 0
                      ? "Free"
                      : formatCurrency(order.deliveryFee)}
                  </span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-zinc-500">
                    <span>Tax</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-app-border font-semibold text-app-green text-base">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <BanknoteIcon className="size-4 text-app-text-light" />
                  <span className="text-xs text-app-text-light capitalize">
                    {order.paymentMethod || "Cash on delivery"}
                  </span>
                  <span
                    className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                      order.isPaid
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.isPaid ? "Paid" : "Pay on delivery"}
                  </span>
                </div>
              </div>
            </div>

            {/* Support / Help */}
            <div className="bg-white rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-2 flex items-center gap-2">
                <InfoIcon className="size-4 text-app-green" />
                Need help?
              </h3>
              <p className="text-xs text-app-text-light mb-3">
                {order.status === "Cancelled"
                  ? "Your order was cancelled. If you have questions about a charge, contact the store."
                  : order.status === "Partially Available"
                    ? "Some items were unavailable. Contact the store for details on what's included."
                    : "For questions about your order, contact the store directly."}
              </p>
              <div className="space-y-2">
                {store?.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    className="flex items-center gap-2 text-sm font-medium text-app-green hover:text-app-green/80 transition-colors"
                  >
                    <PhoneIcon className="size-4 shrink-0" />
                    Call {store?.name || "Store"}
                  </a>
                )}
                {store?.email && (
                  <a
                    href={`mailto:${store.email}?subject=Order ${orderId.slice(-8).toUpperCase()}`}
                    className="flex items-center gap-2 text-sm font-medium text-app-green hover:text-app-green/80 transition-colors"
                  >
                    <InfoIcon className="size-4 shrink-0" />
                    Email {store?.name || "Store"}
                  </a>
                )}
                {!store?.phone && !store?.email && (
                  <p className="text-xs text-zinc-400">
                    Store contact details unavailable.
                  </p>
                )}
              </div>
            </div>

            {/* Browse again after delivery */}
            {order.status === "Delivered" && (
              <Link
                to="/products"
                className="block text-center w-full px-4 py-3 bg-app-green text-white text-sm font-semibold rounded-2xl hover:bg-app-green/90 transition-colors"
              >
                Order Again
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
