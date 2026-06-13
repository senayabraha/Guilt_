import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AlertCircleIcon,
  NavigationIcon,
  PackageIcon,
  RefreshCwIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import OtpModal from "../../components/Delivery/OtpModal";
import CancelModal from "../../components/Delivery/CancelModal";
import DeliveryOrderCard from "../../components/Delivery/DeliveryOrderCard";
import Loading from "../../components/Loading";
import type { DeliveryPartner, Order } from "../../types";
import {
  getMyDeliveries,
  updateDeliveryLocation,
  completeDelivery,
  markDeliveryPickedUp,
  markDeliveryOutForDelivery,
  cancelDelivery,
} from "../../lib/db/deliveryPartners";

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

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [tracking, setTracking] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(
    null,
  );

  const [otpModal, setOtpModal] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const watchIdRef = useRef<number | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyDeliveries(partner._id || partner.id!, tab);
      setOrders(tab === "active" ? sortActive(data) : data);
    } catch (err: any) {
      setError(err?.message || "Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [tab]);

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

  const hasTrackableOrders = orders.some((o) =>
    ["Picked Up", "Out for Delivery"].includes(o.status),
  );

  return (
    <div className="space-y-5">
      {/* Driver status header */}
      <div className="bg-white rounded-2xl border border-app-border px-5 py-4 flex items-center justify-between gap-4">
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

      {/* Tabs */}
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

      {/* Content */}
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
    </div>
  );
}
