import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  NavigationIcon,
  PackageIcon,
  PhoneIcon,
  RefreshCwIcon,
  StoreIcon,
  TruckIcon,
  XCircleIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import Loading from "../../components/Loading";
import OtpModal from "../../components/Delivery/OtpModal";
import ReportIssueModal from "../../components/Delivery/ReportIssueModal";
import type { DeliveryPartner, Order } from "../../types";
import {
  getDeliveryDetail,
  markDeliveryPickedUp,
  markDeliveryOutForDelivery,
  completeDelivery,
  cancelDelivery,
  reportFailedDelivery,
  updateDeliveryLocation,
} from "../../lib/db/deliveryPartners";
import { statusColors } from "../../assets/assets";
import { formatCurrency } from "../../lib/format";
import { useOrderRealtime } from "../../hooks/useOrderRealtime";

// Driver-visible milestone steps (not every backend status)
const TIMELINE_STEPS = [
  { key: "Placed",            label: "Placed" },
  { key: "Assigned",          label: "Assigned" },
  { key: "Ready for Pickup",  label: "Ready" },
  { key: "Picked Up",         label: "Picked" },
  { key: "Out for Delivery",  label: "En Route" },
  { key: "Delivered",         label: "Done" },
];

type StepState = "done" | "current" | "pending";

function stepState(
  key: string,
  currentStatus: string,
  historyStatuses: Set<string>,
): StepState {
  // For terminal-exception states, mark completed steps from history
  if (currentStatus === "Cancelled" || currentStatus === "Failed Delivery") {
    return historyStatuses.has(key) ? "done" : "pending";
  }
  const si = TIMELINE_STEPS.findIndex((s) => s.key === key);
  const ci = TIMELINE_STEPS.findIndex((s) => s.key === currentStatus);
  if (si < 0) return "pending";
  if (ci < 0) return si === 0 ? "current" : "pending";
  if (si < ci) return "done";
  if (si === ci) return "current";
  return "pending";
}

function mapsUrl(
  lat?: number | null,
  lng?: number | null,
  address?: string,
): string | null {
  if (lat && lng && !(lat === 0 && lng === 0))
    return `https://www.google.com/maps?q=${lat},${lng}`;
  if (address)
    return `https://www.google.com/maps/search/${encodeURIComponent(address)}`;
  return null;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusTimeline({
  status,
  statusHistory,
}: {
  status: string;
  statusHistory: { status: string; timestamp?: string }[];
}) {
  const histSet = new Set(statusHistory.map((h) => h.status));
  const isException =
    status === "Cancelled" || status === "Failed Delivery";

  return (
    <div className="bg-white rounded-2xl border border-app-border px-5 py-4 space-y-3">
      {isException && (
        <div
          className={`flex items-center gap-2 ${
            status === "Failed Delivery" ? "text-orange-600" : "text-red-600"
          }`}
        >
          <XCircleIcon className="size-4" />
          <span className="text-sm font-semibold">
            {status === "Failed Delivery"
              ? "Delivery Failed"
              : "Delivery Cancelled"}
          </span>
        </div>
      )}
      <div className="overflow-x-auto pb-1">
        <div className="flex items-center min-w-max gap-0">
          {TIMELINE_STEPS.map((step, idx) => {
            const state = stepState(step.key, status, histSet);
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`size-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      state === "done"
                        ? "bg-app-green"
                        : state === "current"
                          ? "bg-app-green ring-2 ring-app-green/25"
                          : "bg-zinc-200"
                    }`}
                  >
                    {state === "done" && (
                      <CheckIcon className="size-3 text-white" />
                    )}
                    {state === "current" && (
                      <div className="size-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-medium text-center leading-tight w-10 ${
                      state === "pending" ? "text-zinc-400" : "text-zinc-700"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`w-7 h-px mb-3.5 mx-0.5 shrink-0 ${
                      stepState(
                        TIMELINE_STEPS[idx + 1].key,
                        status,
                        histSet,
                      ) !== "pending"
                        ? "bg-app-green"
                        : "bg-zinc-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LocationCard({
  icon,
  label,
  name,
  phone,
  address,
  area,
  instructions,
  navUrl,
}: {
  icon: React.ReactNode;
  label: string;
  name?: string;
  phone?: string;
  address?: string;
  area?: string;
  instructions?: string;
  navUrl: string | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-app-border px-5 py-4 space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-app-green">
        {icon}
        {label}
      </p>
      <div className="space-y-1.5">
        {name && (
          <p className="text-sm font-semibold text-zinc-900">{name}</p>
        )}
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-2 text-sm text-zinc-600 hover:text-app-green active:text-app-green py-1"
          >
            <PhoneIcon className="size-3.5 shrink-0" />
            <span>{phone}</span>
          </a>
        )}
        {area && <p className="text-sm text-zinc-600">{area}</p>}
        {address && (
          <p className="text-sm text-zinc-600">{address}</p>
        )}
        {instructions && (
          <div className="mt-2 px-3 py-2 bg-amber-50 rounded-xl">
            <p className="text-xs text-amber-800 font-medium leading-snug">
              {instructions}
            </p>
          </div>
        )}
      </div>
      {navUrl && (
        <a
          href={navUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 border border-app-border rounded-xl text-sm font-medium text-zinc-700 hover:bg-app-cream transition-colors active:bg-app-cream"
        >
          <ExternalLinkIcon className="size-4 text-app-green" />
          Navigate in Google Maps
        </a>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type ActionKey =
  | "pickup"
  | "outForDelivery"
  | "complete"
  | "cancel"
  | "failedDelivery"
  | null;

const STATUS_INFO: Record<
  string,
  { message: string; bg: string; text: string }
> = {
  Assigned: {
    message:
      "Store is preparing this order. You'll be notified when it's ready for pickup.",
    bg: "bg-amber-50",
    text: "text-amber-800",
  },
  "Ready for Pickup": {
    message: "The order is ready. Head to the store to pick it up.",
    bg: "bg-blue-50",
    text: "text-blue-800",
  },
  "Picked Up": {
    message: "Order collected. Navigate to the customer's address to deliver.",
    bg: "bg-indigo-50",
    text: "text-indigo-800",
  },
  "Out for Delivery": {
    message:
      "Ask the customer for their 6-digit OTP shown on their tracking page.",
    bg: "bg-green-50",
    text: "text-green-800",
  },
  "Failed Delivery": {
    message:
      "Delivery could not be completed. The operations team has been notified.",
    bg: "bg-orange-50",
    text: "text-orange-800",
  },
};

export default function DeliveryOrderDetail() {
  const { partner } = useOutletContext<{ partner: DeliveryPartner }>();
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const partnerId = partner._id || partner.id!;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);

  const [actionLoading, setActionLoading] = useState<ActionKey>(null);
  const [itemsExpanded, setItemsExpanded] = useState(false);

  // Location tracking
  const [tracking, setTracking] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // OTP modal
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");

  // Report issue modal (replaces old CancelModal)
  const [reportIssueOpen, setReportIssueOpen] = useState(false);

  // ── Data ─────────────────────────────────────────────────────────────────
  const fetchOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDeliveryDetail(partnerId, orderId);
      if (!data) {
        setNoAccess(true);
      } else {
        setOrder(data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  // Silent refetch for realtime updates — no loading spinner.
  const silentRefetch = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await getDeliveryDetail(partnerId, orderId);
      if (data) setOrder(data);
    } catch {}
  }, [orderId, partnerId]);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // Subscribe to realtime order updates (e.g., store marks Ready for Pickup).
  useOrderRealtime(orderId, silentRefetch);

  // ── GPS tracking ─────────────────────────────────────────────────────────
  useEffect(() => {
    const isTrackable =
      order &&
      ["Picked Up", "Out for Delivery"].includes(order.status) &&
      tracking;

    if (!isTrackable) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const send = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setLastLocationUpdate(new Date());
      updateDeliveryLocation(orderId!, lat, lng).catch(() => {});
    };

    watchIdRef.current = navigator.geolocation.watchPosition(send, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 10000,
    });

    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(send, () => {}, {
        enableHighAccuracy: true,
      });
    }, 10000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      clearInterval(interval);
    };
  }, [order?.status, tracking]);

  // ── Action handlers ───────────────────────────────────────────────────────
  const handlePickup = async () => {
    setActionLoading("pickup");
    try {
      await markDeliveryPickedUp(orderId!);
      toast.success("Order picked up!");
      await fetchOrder();
    } catch (err: any) {
      toast.error(err?.message || "Failed to confirm pickup");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOutForDelivery = async () => {
    setActionLoading("outForDelivery");
    try {
      await markDeliveryOutForDelivery(orderId!);
      toast.success("Now out for delivery");
      await fetchOrder();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async () => {
    setActionLoading("complete");
    try {
      await completeDelivery(orderId!, otp);
      toast.success("Delivery completed!");
      setOtpOpen(false);
      setOtp("");
      await fetchOrder();
    } catch (err: any) {
      toast.error(err?.message || "Invalid OTP");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (issueType: string, note: string) => {
    const reason = note ? `${issueType}: ${note}` : issueType;
    setActionLoading("cancel");
    try {
      await cancelDelivery(orderId!, reason);
      toast.success("Delivery cancelled");
      setReportIssueOpen(false);
      await fetchOrder();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel delivery");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFailedDelivery = async (issueType: string, note: string) => {
    setActionLoading("failedDelivery");
    try {
      await reportFailedDelivery(orderId!, issueType, note || undefined);
      toast.success("Failure reported — admin has been notified");
      setReportIssueOpen(false);
      await fetchOrder();
    } catch (err: any) {
      toast.error(err?.message || "Failed to report delivery failure");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading / error guards ────────────────────────────────────────────────
  if (loading) return <Loading />;

  if (noAccess) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/delivery")}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeftIcon className="size-4" /> Back
        </button>
        <div className="bg-white rounded-2xl border border-app-border px-5 py-14 text-center space-y-3">
          <AlertCircleIcon className="size-10 text-zinc-300 mx-auto" />
          <p className="text-sm font-semibold text-zinc-900">
            Order not found or not assigned to you
          </p>
          <p className="text-xs text-zinc-500">
            This order may have been reassigned, or it doesn't exist.
          </p>
          <button
            onClick={() => navigate("/delivery")}
            className="inline-flex items-center gap-2 mt-2 px-4 py-2 text-sm font-medium bg-app-green text-white rounded-xl hover:bg-app-green/90 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/delivery")}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeftIcon className="size-4" /> Back
        </button>
        <div className="bg-white rounded-2xl border border-app-border px-5 py-12 text-center space-y-4">
          <AlertCircleIcon className="size-10 text-red-400 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Could not load this order
            </p>
            {error && <p className="text-xs text-zinc-500 mt-1">{error}</p>}
          </div>
          <button
            onClick={fetchOrder}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-app-green text-white rounded-xl hover:bg-app-green/90 transition-colors"
          >
            <RefreshCwIcon className="size-3.5" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const user =
    typeof order.user === "object"
      ? order.user
      : { name: "Customer", email: "", phone: "" };
  const store = order.store;
  const ship = (order.shippingAddress as any) || {};

  const dropName = ship.fullName || user.name;
  const dropPhone = ship.phone || (user as any).phone;
  const dropArea = ship.area || ship.state;
  const dropAddress = ship.address;
  const dropInstructions = ship.instructions;

  const storeNavUrl = mapsUrl(store?.lat, store?.lng, store?.address);
  const dropNavUrl = mapsUrl(ship.lat, ship.lng, dropAddress);

  const statusInfo = STATUS_INFO[order.status];
  const isTerminal = ["Delivered", "Cancelled", "Failed Delivery"].includes(
    order.status,
  );
  const isTrackable = ["Picked Up", "Out for Delivery"].includes(order.status);
  const canReportFailed = ["Picked Up", "Out for Delivery"].includes(
    order.status,
  );
  const isBusy = actionLoading !== null;

  // Last failure/cancel history entry for terminal state display
  const lastExceptionEntry =
    isTerminal && order.status !== "Delivered"
      ? [...order.statusHistory]
          .reverse()
          .find(
            (h) =>
              h.status === order.status ||
              h.status === "Cancelled" ||
              h.status === "Failed Delivery",
          )
      : null;

  return (
    <div className="space-y-4 pb-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/delivery")}
          className="p-2 -ml-1 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeftIcon className="size-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">
            Active Delivery
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-mono font-semibold text-zinc-900">
              #{order._id.slice(-6).toUpperCase()}
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                statusColors[order.status] || "bg-zinc-100 text-zinc-600"
              }`}
            >
              {order.status}
            </span>
          </div>
        </div>
        <button
          onClick={fetchOrder}
          className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
          aria-label="Refresh"
        >
          <RefreshCwIcon className="size-4" />
        </button>
      </div>

      {/* ── Status context banner ───────────────────────────────────── */}
      {statusInfo && (
        <div
          className={`px-4 py-3 rounded-xl text-sm font-medium ${statusInfo.bg} ${statusInfo.text}`}
        >
          {statusInfo.message}
        </div>
      )}

      {/* ── Status timeline ─────────────────────────────────────────── */}
      <StatusTimeline
        status={order.status}
        statusHistory={order.statusHistory}
      />

      {/* ── Pickup card ─────────────────────────────────────────────── */}
      {store && (
        <LocationCard
          icon={<StoreIcon className="size-3.5" />}
          label="Pickup — Store"
          name={store.name}
          phone={store.phone}
          area={[store.state, store.city].filter(Boolean).join(", ")}
          address={store.address}
          navUrl={storeNavUrl}
        />
      )}

      {/* ── Drop-off card ───────────────────────────────────────────── */}
      <LocationCard
        icon={<MapPinIcon className="size-3.5" />}
        label="Drop-off — Customer"
        name={dropName}
        phone={dropPhone}
        area={dropArea}
        address={dropAddress}
        instructions={dropInstructions}
        navUrl={dropNavUrl}
      />

      {/* ── Item summary ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
        <button
          type="button"
          onClick={() => setItemsExpanded((e) => !e)}
          className="w-full px-5 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <PackageIcon className="size-4 text-zinc-500" />
            <span className="text-sm font-semibold text-zinc-900">
              Items ({order.items.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-700">
              {formatCurrency(order.total)}
            </span>
            <ChevronDownIcon
              className={`size-4 text-zinc-400 transition-transform ${
                itemsExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {itemsExpanded && (
          <div className="border-t border-app-border px-5 py-3 space-y-2.5">
            {order.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-800">{item.name}</span>
                <span className="text-zinc-500 text-xs">
                  ×{item.quantity} {item.unit}
                </span>
              </div>
            ))}
            <div className="pt-2.5 border-t border-app-border flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                {order.paymentMethod.toUpperCase()}
              </span>
              <span className="font-semibold text-zinc-900">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Location sharing ────────────────────────────────────────── */}
      {isTrackable && (
        <div className="bg-white rounded-2xl border border-app-border px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`size-8 rounded-xl flex items-center justify-center ${
                tracking ? "bg-green-100" : "bg-zinc-100"
              }`}
            >
              <NavigationIcon
                className={`size-4 ${
                  tracking ? "text-green-600 animate-pulse" : "text-zinc-400"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                Location Sharing
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {tracking
                  ? lastLocationUpdate
                    ? `Updated ${lastLocationUpdate.toLocaleTimeString()}`
                    : "Acquiring location…"
                  : "Off — customer can't track you"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setTracking((t) => !t)}
            className={`shrink-0 px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
              tracking
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-app-green text-white hover:bg-app-green/90"
            }`}
          >
            {tracking ? "Stop" : "Start"}
          </button>
        </div>
      )}

      {/* ── Primary action ──────────────────────────────────────────── */}
      <div className="space-y-3">
        {order.status === "Assigned" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-5 flex items-center gap-3">
            <ClockIcon className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Waiting for store
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                The store will mark this order ready when it's packed. Check
                back soon.
              </p>
            </div>
          </div>
        )}

        {order.status === "Ready for Pickup" && (
          <button
            onClick={handlePickup}
            disabled={isBusy}
            className="w-full py-4 text-base font-bold bg-blue-600 text-white rounded-2xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <TruckIcon className="size-5" />
            {actionLoading === "pickup" ? "Confirming…" : "Confirm Pickup"}
          </button>
        )}

        {order.status === "Picked Up" && (
          <button
            onClick={handleOutForDelivery}
            disabled={isBusy}
            className="w-full py-4 text-base font-bold bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <TruckIcon className="size-5" />
            {actionLoading === "outForDelivery"
              ? "Starting…"
              : "Start Delivery"}
          </button>
        )}

        {order.status === "Out for Delivery" && (
          <button
            onClick={() => setOtpOpen(true)}
            disabled={isBusy}
            className="w-full py-4 text-base font-bold bg-green-600 text-white rounded-2xl hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircleIcon className="size-5" />
            Enter OTP & Complete Delivery
          </button>
        )}

        {order.status === "Delivered" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-5 flex items-center gap-3">
            <CheckCircleIcon className="size-6 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-800">
                Delivery completed
              </p>
              <p className="text-xs text-green-700 mt-0.5">
                This order has been successfully delivered.
              </p>
            </div>
          </div>
        )}

        {order.status === "Failed Delivery" && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-5 flex items-start gap-3">
            <AlertTriangleIcon className="size-6 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-800">
                Delivery could not be completed
              </p>
              {lastExceptionEntry?.note && (
                <p className="text-xs text-orange-700 mt-1">
                  {lastExceptionEntry.note}
                </p>
              )}
              <p className="text-xs text-orange-600 mt-1.5">
                The operations team has been notified. No further action
                required.
              </p>
            </div>
          </div>
        )}

        {order.status === "Cancelled" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-5 flex items-start gap-3">
            <XCircleIcon className="size-6 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">
                Delivery cancelled
              </p>
              {lastExceptionEntry?.note && (
                <p className="text-xs text-red-600 mt-1">
                  {lastExceptionEntry.note}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Report / Cancel zone ─────────────────────────────────── */}
        {!isTerminal && (
          <div className="pt-1 border-t border-dashed border-app-border mt-2">
            <button
              onClick={() => setReportIssueOpen(true)}
              disabled={isBusy}
              className="w-full py-3 text-sm font-medium text-red-600 border border-red-200 rounded-2xl hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <AlertTriangleIcon className="size-4" />
              Report Issue / Cancel Delivery
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {otpOpen && (
        <OtpModal
          setOtpModal={(_) => {
            setOtpOpen(false);
            setOtp("");
          }}
          otp={otp}
          setOtp={setOtp}
          handleComplete={handleComplete}
          submitting={actionLoading === "complete"}
        />
      )}
      {reportIssueOpen && (
        <ReportIssueModal
          canReportFailed={canReportFailed}
          cancelSubmitting={actionLoading === "cancel"}
          failedSubmitting={actionLoading === "failedDelivery"}
          onClose={() => setReportIssueOpen(false)}
          onCancel={handleCancel}
          onReportFailed={handleFailedDelivery}
        />
      )}
    </div>
  );
}
