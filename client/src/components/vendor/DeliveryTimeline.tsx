import { CheckIcon, ClockIcon, TruckIcon, XIcon } from "lucide-react";
import type { DeliveryPartner, DeliveryRequest, Order } from "../../types";

interface DeliveryTimelineProps {
  order: Order;
  requests: DeliveryRequest[];
  loading?: boolean;
}

// Status rank used to determine how far through the delivery lifecycle we are.
const DELIVERY_RANK: Record<string, number> = {
  "Ready for Pickup": 1,
  Assigned: 2,
  "Picked Up": 3,
  "Out for Delivery": 4,
  Delivered: 5,
  "Failed Delivery": 5,
  Cancelled: 5,
};

const TERMINAL = new Set(["Delivered", "Failed Delivery", "Cancelled"]);

const REQUEST_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Searching for driver…",          cls: "bg-amber-100 text-amber-700" },
  accepted:  { label: "Driver accepted",                cls: "bg-green-100 text-green-700" },
  rejected:  { label: "Driver rejected request",        cls: "bg-red-100 text-red-700" },
  expired:   { label: "Expired — no driver accepted",   cls: "bg-zinc-100 text-zinc-500" },
  cancelled: { label: "Request cancelled",              cls: "bg-zinc-100 text-zinc-500" },
};

type StepState = "done" | "active" | "waiting";
type StepVariant = "default" | "success" | "error" | "cancelled";

interface Step {
  id: string;
  label: string;
  state: StepState;
  variant: StepVariant;
  timestamp?: string | null;
  note?: string | null;
  done: boolean;
}

function fmt(ts?: string | null): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function histEntry(history: Order["statusHistory"], status: string) {
  return [...(history ?? [])].reverse().find((h) => h.status === status) ?? null;
}

function buildSteps(order: Order, requests: DeliveryRequest[]): Step[] {
  const history = order.statusHistory ?? [];
  const rank = DELIVERY_RANK[order.status] ?? 0;
  const isTerminal = TERMINAL.has(order.status);
  const driver = order.deliveryPartner;
  const latestReq = requests[0] ?? null;
  const hasReq = requests.length > 0;

  const h = (s: string) => histEntry(history, s);

  const raw: Omit<Step, "state">[] = [];

  // 1. Ready for Pickup
  raw.push({
    id: "ready",
    label: "Ready for Pickup",
    done: rank >= 1,
    variant: "default",
    timestamp: h("Ready for Pickup")?.timestamp,
    note: h("Ready for Pickup")?.note,
  });

  // 2. Driver Requested — only include if there's dispatch evidence
  if (hasReq || rank >= 2) {
    raw.push({
      id: "requested",
      label: "Driver Requested",
      done: hasReq,
      variant: "default",
      timestamp: latestReq?.createdAt ?? h("Assigned")?.timestamp,
      note: null, // badge rendered separately
    });
  }

  // 3. Driver Assigned
  raw.push({
    id: "assigned",
    label: "Driver Assigned",
    done: rank >= 2 || !!driver,
    variant: "default",
    timestamp: h("Assigned")?.timestamp,
    note: h("Assigned")?.note,
  });

  // 4. Picked Up
  raw.push({
    id: "picked_up",
    label: "Picked Up",
    done: rank >= 3,
    variant: "default",
    timestamp: h("Picked Up")?.timestamp,
    note: h("Picked Up")?.note,
  });

  // 5. Out for Delivery
  raw.push({
    id: "out_for_delivery",
    label: "Out for Delivery",
    done: rank >= 4,
    variant: "default",
    timestamp: h("Out for Delivery")?.timestamp,
    note: h("Out for Delivery")?.note,
  });

  // 6. Terminal step
  if (order.status === "Delivered") {
    raw.push({ id: "delivered",  label: "Delivered",        done: true, variant: "success",   timestamp: h("Delivered")?.timestamp });
  } else if (order.status === "Failed Delivery") {
    raw.push({ id: "failed",     label: "Delivery Failed",  done: true, variant: "error",     timestamp: h("Failed Delivery")?.timestamp, note: h("Failed Delivery")?.note });
  } else if (order.status === "Cancelled") {
    raw.push({ id: "cancelled",  label: "Cancelled",        done: true, variant: "cancelled", timestamp: h("Cancelled")?.timestamp, note: h("Cancelled")?.note });
  } else {
    raw.push({ id: "delivered",  label: "Delivered",        done: false, variant: "success" });
  }

  // Assign states: done → "done", first incomplete → "active" (if not terminal), rest → "waiting"
  let foundActive = false;
  return raw.map((step) => {
    if (step.done) return { ...step, state: "done" as StepState };
    if (!foundActive && !isTerminal) {
      foundActive = true;
      return { ...step, state: "active" as StepState };
    }
    return { ...step, state: "waiting" as StepState };
  });
}

export default function DeliveryTimeline({
  order,
  requests,
  loading = false,
}: DeliveryTimelineProps) {
  const driver = order.deliveryPartner as DeliveryPartner | null;
  const latestReq = requests[0] ?? null;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="size-7 rounded-full bg-zinc-100 shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-3 bg-zinc-100 rounded w-1/3" />
              <div className="h-2.5 bg-zinc-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const steps = buildSteps(order, requests);

  return (
    <div>
      {/* Driver card — shown whenever a driver is assigned */}
      {driver && (
        <div className="mb-5 flex items-center gap-3 bg-zinc-50 border border-app-border rounded-xl px-4 py-3">
          <div className="size-9 rounded-full bg-app-green flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-semibold">
              {driver.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-zinc-900 text-sm">{driver.name}</p>
            <p className="text-xs text-zinc-500 capitalize">
              {driver.vehicleType}
              {driver.phone ? ` · ${driver.phone}` : ""}
            </p>
          </div>
          <TruckIcon className="size-4 text-zinc-400 shrink-0" />
        </div>
      )}

      {/* Steps */}
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const isDone = step.state === "done";
        const isActive = step.state === "active";

        let dotBg = "bg-white border-zinc-200";
        let dotContent: React.ReactNode = <div className="size-2.5 rounded-full bg-zinc-200" />;

        if (isDone && step.variant === "success") {
          dotBg = "bg-green-600 border-green-600";
          dotContent = <CheckIcon className="size-3.5 text-white" />;
        } else if (isDone && step.variant === "error") {
          dotBg = "bg-orange-500 border-orange-500";
          dotContent = <XIcon className="size-3.5 text-white" />;
        } else if (isDone && step.variant === "cancelled") {
          dotBg = "bg-zinc-400 border-zinc-400";
          dotContent = <XIcon className="size-3.5 text-white" />;
        } else if (isDone) {
          dotBg = "bg-app-green border-app-green";
          dotContent = <CheckIcon className="size-3.5 text-white" />;
        } else if (isActive) {
          dotBg = "bg-white border-app-green";
          dotContent = <div className="size-2.5 rounded-full bg-app-green animate-pulse" />;
        }

        const labelCls = isDone
          ? step.variant === "success"
            ? "text-green-800 font-semibold"
            : step.variant === "error"
              ? "text-orange-800 font-semibold"
              : step.variant === "cancelled"
                ? "text-zinc-500 font-semibold"
                : "text-zinc-900 font-semibold"
          : isActive
            ? "text-zinc-900 font-semibold"
            : "text-zinc-400 font-medium";

        return (
          <div key={step.id} className="flex gap-3">
            {/* Dot + connector */}
            <div className="flex flex-col items-center">
              <div className={`size-7 rounded-full flex items-center justify-center border-2 shrink-0 ${dotBg}`}>
                {dotContent}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 min-h-3 mt-0.5 ${isDone ? "bg-app-green" : "bg-zinc-100"}`} />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-4"}`}>
              <div className="flex items-start justify-between gap-2 flex-wrap min-h-7">
                <span className={`text-sm leading-7 ${labelCls}`}>{step.label}</span>
                {step.timestamp && (
                  <span className="text-xs text-zinc-400 flex items-center gap-1 leading-7 shrink-0">
                    <ClockIcon className="size-3" />
                    {fmt(step.timestamp)}
                  </span>
                )}
              </div>

              {step.note && (
                <p className={`text-xs mt-0.5 ${step.variant === "error" ? "text-orange-700" : "text-zinc-500"}`}>
                  {step.note}
                </p>
              )}

              {/* Request badge on "requested" step */}
              {step.id === "requested" && latestReq && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${REQUEST_BADGE[latestReq.status]?.cls ?? "bg-zinc-100 text-zinc-600"}`}>
                    {REQUEST_BADGE[latestReq.status]?.label ?? latestReq.status}
                  </span>
                  {latestReq.rejectReason && (
                    <span className="text-xs text-red-600">"{latestReq.rejectReason}"</span>
                  )}
                  {requests.length > 1 && (
                    <span className="text-[10px] text-zinc-400">{requests.length} requests total</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
