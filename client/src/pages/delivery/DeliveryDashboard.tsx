import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AlertCircleIcon,
  BellIcon,
  CircleIcon,
  NavigationIcon,
  PackageIcon,
  RefreshCwIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import OtpModal from "../../components/Delivery/OtpModal";
import CancelModal from "../../components/Delivery/CancelModal";
import DeliveryOrderCard from "../../components/Delivery/DeliveryOrderCard";
import IncomingRequestCard from "../../components/Delivery/IncomingRequestCard";
import RejectRequestModal from "../../components/Delivery/RejectRequestModal";
import Loading from "../../components/Loading";
import type {
  DeliveryPartner,
  DeliveryRequest,
  DriverAvailabilityStatus,
  Order,
} from "../../types";
import {
  getMyDeliveries,
  updateDeliveryLocation,
  completeDelivery,
  markDeliveryPickedUp,
  markDeliveryOutForDelivery,
  cancelDelivery,
  updateDriverAvailability,
} from "../../lib/db/deliveryPartners";
import {
  getMyDeliveryRequests,
  acceptDeliveryRequest,
  rejectDeliveryRequest,
} from "../../lib/db/deliveryRequests";
import { supabase } from "../../lib/supabase";

const STATUS_PRIORITY: Record<string, number> = {
  "Out for Delivery": 4,
  "Picked Up": 3,
  "Ready for Pickup": 2,
  Assigned: 1,
};

function sortActive(orders: Order[]): Order[] {
  return [...orders].sort(
    (a, b) =>
      (STATUS_PRIORITY[b.status] ?? 0) - (STATUS_PRIORITY[a.status] ?? 0),
  );
}

export default function DeliveryDashboard() {
  const { partner } = useOutletContext<{ partner: DeliveryPartner }>();
  const partnerId = partner._id || partner.id!;

  // ── Orders state ────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "completed">("active");

  // ── Tracking / GPS ──────────────────────────────────────────
  const [tracking, setTracking] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // ── Availability ────────────────────────────────────────────
  const [availability, setAvailability] = useState<DriverAvailabilityStatus>(
    partner.availabilityStatus,
  );
  const [togglingAvail, setTogglingAvail] = useState(false);

  // ── Delivery requests (incoming) ────────────────────────────
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [actioningRequest, setActioningRequest] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState(false);

  // ── Active delivery modals ───────────────────────────────────
  const [otpModal, setOtpModal] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // ── Data fetching ────────────────────────────────────────────
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyDeliveries(partnerId, tab);
      setOrders(tab === "active" ? sortActive(data) : data);
    } catch (err: any) {
      setError(err?.message || "Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      setRequests(await getMyDeliveryRequests("pending"));
    } catch {
      // silently fail — requests are secondary to active deliveries
    } finally {
      setRequestsLoading(false);
    }
  };

  // Initial load + tab-switch reload
  useEffect(() => {
    fetchOrders();
  }, [tab]);

  // Fetch incoming requests once on mount + subscribe to realtime
  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel(`driver-requests-${partnerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "delivery_requests",
          filter: `delivery_partner_id=eq.${partnerId}`,
        },
        () => {
          fetchRequests();
          toast("New delivery request incoming!", { icon: "🔔" });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_requests",
          filter: `delivery_partner_id=eq.${partnerId}`,
        },
        () => fetchRequests(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId]);

  // ── GPS location tracking ────────────────────────────────────
  useEffect(() => {
    const trackableOrders = orders.filter((o) =>
      ["Picked Up", "Out for Delivery"].includes(o.status),
    );

    if (trackableOrders.length === 0 || !tracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const sendLocation = (pos: GeolocationPosition) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setLastLocationUpdate(new Date());
      trackableOrders.forEach((order) => {
        updateDeliveryLocation(order.id || order._id, lat, lng).catch(() => {});
      });
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 },
    );

    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendLocation, () => {}, {
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
  }, [orders, tracking]);

  // ── Active delivery handlers ─────────────────────────────────
  const handleMarkPickedUp = async (orderId: string) => {
    try {
      await markDeliveryPickedUp(orderId);
      toast.success("Order picked up");
      fetchOrders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as picked up");
    }
  };

  const handleMarkOutForDelivery = async (orderId: string) => {
    try {
      await markDeliveryOutForDelivery(orderId);
      toast.success("Out for delivery");
      fetchOrders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status");
    }
  };

  const handleComplete = async () => {
    if (!otpModal || !otp) return;
    setSubmitting(true);
    try {
      await completeDelivery(otpModal, otp);
      toast.success("Delivery completed!");
      setOtpModal(null);
      setOtp("");
      fetchOrders();
    } catch (err: any) {
      toast.error(err?.message || "Invalid OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    setSubmitting(true);
    try {
      await cancelDelivery(cancelModal, cancelReason);
      toast.success("Delivery cancelled");
      setCancelModal(null);
      setCancelReason("");
      fetchOrders();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel delivery");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Incoming request handlers ────────────────────────────────
  const handleAcceptRequest = async (requestId: string) => {
    setActioningRequest(requestId);
    try {
      await acceptDeliveryRequest(requestId);
      toast.success("Request accepted — order assigned to you!");
      // Refresh both: the request disappears, the order appears in Active
      await Promise.all([fetchRequests(), fetchOrders()]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept request");
    } finally {
      setActioningRequest(null);
    }
  };

  const handleRejectRequest = async (reason: string) => {
    if (!rejectTarget) return;
    setRejectingRequest(true);
    try {
      await rejectDeliveryRequest(rejectTarget, reason || undefined);
      toast.success("Request rejected");
      setRejectTarget(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject request");
    } finally {
      setRejectingRequest(false);
    }
  };

  // ── Availability ─────────────────────────────────────────────
  const hasTrackableOrders = orders.some((o) =>
    ["Picked Up", "Out for Delivery"].includes(o.status),
  );

  const handleToggleAvailability = async () => {
    const next: DriverAvailabilityStatus =
      availability === "online" ? "offline" : "online";
    setTogglingAvail(true);
    try {
      await updateDriverAvailability(next);
      setAvailability(next);
      toast.success(
        next === "online" ? "You are now online" : "You are now offline",
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update availability");
    } finally {
      setTogglingAvail(false);
    }
  };

  const AVAIL_DOT: Record<DriverAvailabilityStatus, string> = {
    online: "bg-green-500",
    busy: "bg-amber-500",
    unavailable: "bg-red-500",
    offline: "bg-zinc-400",
  };
  const AVAIL_LABEL: Record<DriverAvailabilityStatus, string> = {
    online: "Online",
    busy: "Busy",
    unavailable: "Unavailable",
    offline: "Offline",
  };

  return (
    <div className="space-y-5">
      {/* ── Driver status header ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-app-border overflow-hidden">
        {/* Row 1: name + location toggle */}
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">
              Welcome back
            </p>
            <p className="text-base font-semibold text-zinc-900 mt-0.5">
              {partner.name}
            </p>
            {tab === "active" && orders.length > 0 && (
              <p className="text-xs text-zinc-500 mt-1">
                {orders.length} active assignment
                {orders.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              if (!hasTrackableOrders && !tracking) {
                toast(
                  "Location sharing activates when orders reach Picked Up or Out for Delivery.",
                  { icon: "ℹ️" },
                );
              }
              setTracking((prev) => !prev);
            }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              tracking
                ? "bg-green-600 text-white"
                : "bg-white border border-app-border text-zinc-600 hover:bg-app-cream"
            }`}
          >
            <NavigationIcon
              className={`w-3.5 h-3.5 ${tracking ? "animate-pulse" : ""}`}
            />
            {tracking
              ? lastLocationUpdate
                ? "Live"
                : "Locating…"
              : "Location"}
          </button>
        </div>

        {/* Row 2: availability toggle */}
        <div className="px-5 py-3 border-t border-app-border bg-zinc-50/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ${AVAIL_DOT[availability]}`}
            />
            <span className="text-sm font-medium text-zinc-700">
              {AVAIL_LABEL[availability]}
            </span>
            {availability === "busy" && (
              <span className="text-xs text-zinc-500">(active delivery)</span>
            )}
          </div>
          {availability === "busy" || availability === "unavailable" ? (
            <span className="text-xs text-zinc-400 italic">
              {availability === "busy"
                ? "Set automatically during delivery"
                : "Contact admin"}
            </span>
          ) : (
            <button
              onClick={handleToggleAvailability}
              disabled={togglingAvail}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                availability === "online"
                  ? "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                  : "bg-app-green text-white hover:bg-app-green/90"
              }`}
            >
              <CircleIcon className="size-2.5 fill-current" />
              {togglingAvail
                ? "Updating…"
                : availability === "online"
                  ? "Go Offline"
                  : "Go Online"}
            </button>
          )}
        </div>
      </div>

      {/* ── Incoming Requests ─────────────────────────────────── */}
      {(requestsLoading || requests.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BellIcon className="size-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Incoming Requests
            </h2>
            {requests.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                {requests.length}
              </span>
            )}
          </div>
          {requestsLoading && requests.length === 0 ? (
            <div className="h-20 bg-white rounded-2xl border border-app-border animate-pulse" />
          ) : (
            requests.map((req) => (
              <IncomingRequestCard
                key={req.id}
                request={req}
                onAccept={handleAcceptRequest}
                onReject={(id) => setRejectTarget(id)}
                actioning={actioningRequest === req.id}
              />
            ))
          )}
        </div>
      )}

      {/* ── Active / Completed Tabs ───────────────────────────── */}
      <div className="flex gap-2">
        {(["active", "completed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              tab === t
                ? "bg-app-green text-white"
                : "bg-white text-zinc-600 hover:bg-app-cream border border-app-border"
            }`}
          >
            {t === "active" ? "Active" : "Completed"}
          </button>
        ))}
      </div>

      {/* ── Order list ────────────────────────────────────────── */}
      {loading ? (
        <Loading />
      ) : error ? (
        <div className="bg-white rounded-2xl border border-app-border px-5 py-12 text-center space-y-4">
          <AlertCircleIcon className="size-10 text-red-400 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Could not load deliveries
            </p>
            <p className="text-xs text-zinc-500 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchOrders}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-app-green text-white rounded-xl hover:bg-app-green/90 transition-colors"
          >
            <RefreshCwIcon className="size-3.5" />
            Try again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-app-border px-5 py-14 text-center space-y-2">
          <PackageIcon className="size-12 text-zinc-200 mx-auto mb-3" />
          <p className="text-base font-semibold text-zinc-900">
            {tab === "active"
              ? "No active deliveries"
              : "No completed deliveries"}
          </p>
          <p className="text-sm text-zinc-500">
            {tab === "active"
              ? "New assignments will appear here automatically."
              : "Your completed deliveries will appear here."}
          </p>
          <button
            onClick={fetchOrders}
            className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs font-medium text-zinc-500 border border-app-border rounded-lg hover:bg-app-cream transition-colors"
          >
            <RefreshCwIcon className="size-3" />
            Refresh
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, idx) => (
            <DeliveryOrderCard
              key={order.id || order._id}
              order={order}
              tab={tab}
              isPriority={tab === "active" && idx === 0}
              onMarkPickedUp={handleMarkPickedUp}
              onMarkOutForDelivery={handleMarkOutForDelivery}
              setOtpModal={setOtpModal}
              setCancelModal={setCancelModal}
            />
          ))}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────── */}
      {otpModal && (
        <OtpModal
          setOtpModal={setOtpModal}
          otp={otp}
          setOtp={setOtp}
          handleComplete={handleComplete}
          submitting={submitting}
        />
      )}
      {cancelModal && (
        <CancelModal
          setCancelModal={setCancelModal}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          handleCancel={handleCancel}
          submitting={submitting}
        />
      )}
      {rejectTarget && (
        <RejectRequestModal
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectRequest}
          submitting={rejectingRequest}
        />
      )}
    </div>
  );
}
