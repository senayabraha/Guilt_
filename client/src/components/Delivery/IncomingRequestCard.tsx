import { useEffect, useState } from "react";
import {
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  PackageIcon,
  StoreIcon,
  XIcon,
} from "lucide-react";
import type { DeliveryRequest } from "../../types";
import { formatCurrency } from "../../lib/format";

function useCountdownSeconds(expiresAt: string | null): number | null {
  const calc = () =>
    expiresAt
      ? Math.max(
          0,
          Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
        )
      : null;

  const [seconds, setSeconds] = useState<number | null>(calc);

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(
      () =>
        setSeconds(
          Math.max(
            0,
            Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
          ),
        ),
      1000,
    );
    return () => clearInterval(id);
  }, [expiresAt]);

  return seconds;
}

function formatCountdown(s: number): string {
  if (s <= 0) return "Expired";
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

interface Props {
  request: DeliveryRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  actioning: boolean;
}

export default function IncomingRequestCard({
  request,
  onAccept,
  onReject,
  actioning,
}: Props) {
  const countdown = useCountdownSeconds(request.expiresAt);
  const snap = request.orderSnapshot;
  const isExpired = countdown !== null && countdown <= 0;
  const isUrgent = countdown !== null && countdown > 0 && countdown <= 60;

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition-opacity ${
        isExpired
          ? "border-zinc-200 opacity-60"
          : "border-amber-300 shadow-sm shadow-amber-100"
      }`}
    >
      {/* Banner */}
      <div
        className={`px-5 py-2.5 flex items-center justify-between ${
          isExpired ? "bg-zinc-50" : "bg-amber-50"
        }`}
      >
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            isExpired ? "text-zinc-400" : "text-amber-700"
          }`}
        >
          {isExpired ? "Request Expired" : "Incoming Delivery Request"}
        </span>
        {countdown !== null && (
          <span
            className={`flex items-center gap-1 text-xs font-mono font-semibold ${
              isExpired
                ? "text-zinc-400"
                : isUrgent
                  ? "text-red-600 animate-pulse"
                  : "text-amber-600"
            }`}
          >
            <ClockIcon className="size-3" />
            {formatCountdown(countdown)}
          </span>
        )}
      </div>

      {/* Route */}
      <div className="px-5 py-4">
        {snap ? (
          <>
            <div className="flex gap-3">
              {/* Left: icon column with connecting line */}
              <div className="flex flex-col items-center">
                <div className="size-6 rounded-full bg-app-green/10 flex items-center justify-center shrink-0">
                  <StoreIcon className="size-3.5 text-app-green" />
                </div>
                <div className="w-px flex-1 my-1.5 border-l-2 border-dashed border-zinc-200 min-h-5" />
                <div className="size-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <MapPinIcon className="size-3.5 text-blue-600" />
                </div>
              </div>

              {/* Right: content */}
              <div className="flex flex-col justify-between flex-1 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-app-green">
                    Pickup
                  </p>
                  <p className="text-sm font-medium text-zinc-900">
                    {snap.storeName}
                  </p>
                  {snap.storeAddress && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {snap.storeAddress}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                    Dropoff
                  </p>
                  <p className="text-sm font-medium text-zinc-900">
                    {snap.deliveryArea || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Order summary */}
            <div className="mt-3 pt-3 border-t border-app-border flex items-center gap-2">
              <PackageIcon className="size-3.5 text-zinc-400 shrink-0" />
              <span className="text-xs text-zinc-500">
                {snap.itemCount} item{snap.itemCount !== 1 ? "s" : ""}
              </span>
              <span className="text-zinc-300">·</span>
              <span className="text-xs font-semibold text-zinc-700">
                {formatCurrency(snap.total)}
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500 py-2">
            Order #{request.orderId.slice(-6).toUpperCase()}
          </p>
        )}
      </div>

      {/* Actions */}
      {!isExpired && (
        <div className="px-5 pb-4 space-y-2">
          <button
            onClick={() => onAccept(request.id)}
            disabled={actioning}
            className="w-full py-3 text-sm font-semibold bg-app-green text-white rounded-xl hover:bg-app-green/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckIcon className="size-4" />
            {actioning ? "Accepting…" : "Accept Request"}
          </button>
          <button
            onClick={() => onReject(request.id)}
            disabled={actioning}
            className="w-full py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <XIcon className="size-4" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
