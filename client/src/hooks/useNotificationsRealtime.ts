import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import type { Notification } from "../types";

// Subscribe to INSERT events on the notifications table for the signed-in user.
// Calls onNew(row) whenever a new notification arrives.
// Components typically use this to increment a badge counter or trigger a refetch.
export function useNotificationsRealtime(
  userId: string | null | undefined,
  onNew: (notification: Partial<Notification>) => void,
) {
  const cbRef = useRef(onNew);
  cbRef.current = onNew;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => cbRef.current(payload.new as Partial<Notification>),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
