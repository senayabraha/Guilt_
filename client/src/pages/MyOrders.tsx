import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarIcon,
  ChevronRightIcon,
  PackageIcon,
  RefreshCwIcon,
  StoreIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { useCart } from "../context/CartContext";
import { statusColors } from "../assets/assets";
import Loading from "../components/Loading";
import { getMyOrders } from "../lib/db/orders";
import type { Order } from "../types";
import { formatCurrency } from "../lib/format";

// Status sets for client-side tab filtering.
const ACTIVE_STATUSES = new Set([
  "Placed", "Confirmed", "Preparing", "Partially Available",
  "Ready for Pickup", "Assigned", "Packed",
]);
const TRANSIT_STATUSES = new Set(["Picked Up", "Out for Delivery"]);

const TABS = [
  { value: "all", label: "All Orders" },
  { value: "active", label: "Active" },
  { value: "transit", label: "On the Way" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const TAB_EMPTY: Record<string, { heading: string; sub: string }> = {
  all: {
    heading: "No orders yet",
    sub: "Your order history will appear here after your first purchase.",
  },
  active: {
    heading: "No active orders",
    sub: "Orders being prepared by the store will show here.",
  },
  transit: {
    heading: "Nothing on the way",
    sub: "Orders that are out for delivery will appear here.",
  },
  delivered: {
    heading: "No delivered orders",
    sub: "Successfully delivered orders will appear here.",
  },
  cancelled: {
    heading: "No cancelled orders",
    sub: "Cancelled orders will appear here.",
  },
};

// "3m ago" / "2h ago" / "Jun 5" — concise recency label.
function orderDate(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// True if the order is not in a terminal (non-changing) state.
const isLive = (o: Order) =>
  !["Delivered", "Cancelled"].includes(o.status);

const REFRESH_INTERVAL_MS = 30_000;

const MyOrders = () => {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const { clearCart } = useCart();
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const fetchOrders = async (showLoader: boolean) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      // Always fetch all orders; tab filtering is client-side.
      const data = await getMyOrders();
      setAllOrders(data);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("clearCart")) {
      clearCart();
      setSearchParams({});
    }
    fetchOrders(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background refresh every 30 s while any live order exists.
  useEffect(() => {
    const id = setInterval(() => {
      if (allOrders.some(isLive)) fetchOrders(false);
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [allOrders]);

  // Client-side tab filtering.
  const orders = useMemo(() => {
    switch (activeTab) {
      case "active": return allOrders.filter((o) => ACTIVE_STATUSES.has(o.status));
      case "transit": return allOrders.filter((o) => TRANSIT_STATUSES.has(o.status));
      case "delivered": return allOrders.filter((o) => o.status === "Delivered");
      case "cancelled": return allOrders.filter((o) => o.status === "Cancelled");
      default: return allOrders;
    }
  }, [allOrders, activeTab]);

  // Badge counts for live tabs.
  const activeCount = allOrders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;
  const transitCount = allOrders.filter((o) => TRANSIT_STATUSES.has(o.status)).length;

  const emptyCtx = TAB_EMPTY[activeTab] ?? TAB_EMPTY.all;

  return (
    <div className="min-h-screen bg-app-cream mb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">My Orders</h1>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => fetchOrders(false)}
            title="Refresh"
            className="p-2 rounded-xl border border-app-border text-app-text-light hover:text-app-green hover:border-app-green transition-colors disabled:opacity-40"
          >
            <RefreshCwIcon className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {TABS.map((tab) => {
            const count =
              tab.value === "active"
                ? activeCount
                : tab.value === "transit"
                  ? transitCount
                  : 0;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`relative px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${
                  activeTab === tab.value
                    ? "bg-app-green text-white"
                    : "bg-white text-app-text-light hover:bg-app-cream"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold ${
                      activeTab === tab.value
                        ? "bg-white/20 text-white"
                        : "bg-app-orange text-white"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Orders */}
        {loading ? (
          <Loading />
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <PackageIcon className="size-14 text-app-border mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-zinc-800 mb-2">
              {emptyCtx.heading}
            </h2>
            <p className="text-sm text-app-text-light mb-6 max-w-xs mx-auto">
              {emptyCtx.sub}
            </p>
            {activeTab === "all" && (
              <Link
                to="/products"
                className="inline-flex px-5 py-2.5 bg-app-green text-white text-sm font-semibold rounded-xl hover:bg-app-green/90 transition-colors"
              >
                Browse Products
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const id = order.id || order._id;
              const live = isLive(order);
              return (
                <Link
                  key={id}
                  to={`/orders/${id}`}
                  className="block bg-white rounded-2xl p-5 hover:shadow-sm border border-transparent hover:border-app-border transition-all"
                >
                  {/* Row 1: order ID + status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {live && (
                          <span className="size-2 rounded-full bg-app-orange animate-pulse shrink-0" />
                        )}
                        <p className="text-sm font-semibold text-zinc-900">
                          Order #{id.slice(-8).toUpperCase()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-app-text-light">
                        <CalendarIcon className="size-3" />
                        <span>{orderDate(order.createdAt)}</span>
                        {order.store?.name && (
                          <>
                            <span>·</span>
                            <StoreIcon className="size-3" />
                            <span className="truncate max-w-[140px]">
                              {order.store.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColors[order.status] ?? "bg-zinc-100 text-zinc-600"}`}
                      >
                        {order.status}
                      </span>
                      <ChevronRightIcon className="size-4 text-app-text-light" />
                    </div>
                  </div>

                  {/* Row 2: item thumbnails */}
                  <div className="flex items-center gap-2 mb-3">
                    {order.items.slice(0, 4).map((item, i) => (
                      <img
                        key={i}
                        src={item.image}
                        alt={item.name}
                        className="size-12 sm:size-14 rounded-lg object-cover border border-app-border"
                      />
                    ))}
                    {order.items.length > 4 && (
                      <div className="size-12 sm:size-14 rounded-lg bg-app-cream flex items-center justify-center text-xs font-semibold text-app-text-light">
                        +{order.items.length - 4}
                      </div>
                    )}
                  </div>

                  {/* Row 3: items count + total */}
                  <div className="flex items-center justify-between text-sm border-t border-app-border pt-3">
                    <span className="text-app-text-light">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </span>
                    <span className="font-semibold text-app-green">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
