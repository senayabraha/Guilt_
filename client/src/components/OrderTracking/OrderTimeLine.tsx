import { CheckIcon, ClockIcon, PackageIcon, TruckIcon, XCircleIcon } from "lucide-react";

const MAIN_STATUSES = [
  "Placed",
  "Confirmed",
  "Preparing",
  "Ready for Pickup",
  "Picked Up",
  "Out for Delivery",
  "Delivered",
] as const;

type MainStatus = (typeof MAIN_STATUSES)[number];

const STATUS_ICONS: Record<string, React.ElementType> = {
  Placed: ClockIcon,
  Confirmed: CheckIcon,
  Preparing: PackageIcon,
  "Ready for Pickup": PackageIcon,
  "Picked Up": TruckIcon,
  "Out for Delivery": TruckIcon,
  Delivered: CheckIcon,
  Cancelled: XCircleIcon,
};

export default function OrderTimeLine({ order }: { order: any }) {
  const isCancelled = order.status === "Cancelled";
  const isPartiallyAvailable = order.status === "Partially Available";

  // Map Partially Available → Ready for Pickup position for display.
  const mappedStatus = isPartiallyAvailable ? "Ready for Pickup" : order.status;
  const regularIdx = MAIN_STATUSES.indexOf(mappedStatus as MainStatus);

  // For cancelled orders, find the highest status index that appears in history.
  // Placed is always index 0 (it's the initial state, may not be in history).
  const historyStatuses = new Set(
    (order.statusHistory ?? []).map((h: any) => h.status),
  );
  const lastReachedIdx = isCancelled
    ? MAIN_STATUSES.reduce(
        (max, s, i) => (historyStatuses.has(s) ? i : max),
        0,
      )
    : regularIdx;

  // Append a "Cancelled" terminal node when the order was cancelled.
  const displayStatuses: string[] = isCancelled
    ? [...MAIN_STATUSES, "Cancelled"]
    : [...MAIN_STATUSES];

  return (
    <div className="bg-white rounded-2xl p-5">
      <h2 className="text-base font-semibold text-zinc-900 mb-5">
        Delivery Progress
      </h2>
      <div>
        {displayStatuses.map((status, i) => {
          const isCancelledNode = status === "Cancelled";
          const Icon = STATUS_ICONS[status] || PackageIcon;

          const isCompleted = !isCancelledNode && i <= lastReachedIdx;
          // Current = the latest reached step (not cancelled terminal, not cancelled state)
          const isCurrent = !isCancelled && !isCancelledNode && i === regularIdx;
          const isPartialNote = isPartiallyAvailable && status === "Ready for Pickup";

          const historyEntry = (order.statusHistory ?? []).find(
            (h: any) => h.status === status,
          );

          // Connector colour below each node.
          const connectorClass = isCancelled && i === lastReachedIdx
            ? "bg-red-200"
            : i < lastReachedIdx
              ? "bg-app-green"
              : "bg-app-border";

          return (
            <div key={status} className="flex gap-4">
              {/* Icon bubble + connector */}
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "size-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    isCancelledNode
                      ? "bg-red-100 text-red-600 ring-4 ring-red-100/60"
                      : isCompleted
                        ? "bg-app-green text-white"
                        : "bg-app-cream text-app-text-light",
                    isCurrent ? "ring-4 ring-app-green/20" : "",
                  ].join(" ")}
                >
                  <Icon className="size-4" />
                </div>
                {i < displayStatuses.length - 1 && (
                  <div className={`w-0.5 h-12 ${connectorClass}`} />
                )}
              </div>

              {/* Label + timestamp + note */}
              <div className="pb-6 min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    isCancelledNode
                      ? "text-red-600"
                      : isCompleted || isCurrent
                        ? "text-app-green"
                        : "text-app-text-light"
                  }`}
                >
                  {isPartialNote ? "Partially Available" : status}
                </p>
                {isPartialNote && (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Some items unavailable — prepared items are ready
                  </p>
                )}
                {historyEntry && (
                  <p className="text-xs text-app-text-light mt-0.5">
                    {new Date(historyEntry.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {historyEntry.note &&
                      historyEntry.note.toLowerCase() !== status.toLowerCase() && (
                        <span className="ml-1 text-zinc-400">
                          — {historyEntry.note}
                        </span>
                      )}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
