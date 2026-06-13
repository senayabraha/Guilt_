import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// Subscribe to UPDATE events on a single order row.
// Calls onUpdate() whenever the row changes — component is responsible for refetching.
export function useOrderRealtime(
  orderId: string | null | undefined,
  onUpdate: () => void,
) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => cbRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);
}

// Subscribe to INSERT and UPDATE events on all orders for a store.
// Calls onUpdate() on any change — component is responsible for refetching.
export function useStoreOrdersRealtime(
  storeId: string | null | undefined,
  onUpdate: () => void,
) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`store-orders-${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        () => cbRef.current(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `store_id=eq.${storeId}`,
        },
        () => cbRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);
}

// Subscribe to UPDATE events on orders assigned to a specific delivery partner.
export function useDriverOrdersRealtime(
  partnerId: string | null | undefined,
  onUpdate: () => void,
) {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    if (!partnerId) return;

    const channel = supabase
      .channel(`driver-orders-${partnerId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `delivery_partner_id=eq.${partnerId}`,
        },
        () => cbRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId]);
}
