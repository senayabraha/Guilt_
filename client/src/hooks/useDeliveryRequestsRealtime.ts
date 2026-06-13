import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// Subscribe to INSERT and UPDATE events on delivery_requests for a specific driver.
// onInsert fires when a new request is targeted at this partner.
// onUpdate fires when an existing request's status changes (e.g., expired, cancelled).
export function useDeliveryRequestsRealtime(
  partnerId: string | null | undefined,
  onInsert: () => void,
  onUpdate: () => void,
) {
  const insertRef = useRef(onInsert);
  const updateRef = useRef(onUpdate);
  insertRef.current = onInsert;
  updateRef.current = onUpdate;

  useEffect(() => {
    if (!partnerId) return;

    const channel = supabase
      .channel(`delivery-requests-${partnerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "delivery_requests",
          filter: `delivery_partner_id=eq.${partnerId}`,
        },
        () => insertRef.current(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_requests",
          filter: `delivery_partner_id=eq.${partnerId}`,
        },
        () => updateRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId]);
}
