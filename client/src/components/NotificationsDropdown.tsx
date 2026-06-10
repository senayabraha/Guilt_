import { useEffect, useMemo, useRef, useState } from "react";
import { BellIcon, CheckIcon, PackageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Notification } from "../types";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../lib/db/notifications";

const relativeTime = (dateString: string) => {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const notificationPath = (notification: Notification) => {
  if (notification.entityType === "order" && notification.entityId) {
    if (notification.audience === "VENDOR") return "/vendor";
    if (notification.audience === "DELIVERY") return "/delivery";
    if (notification.audience === "ADMIN") return "/admin/orders";
    return `/orders/${notification.entityId}`;
  }
  if (notification.entityType === "store" && notification.entityId) {
    if (notification.audience === "ADMIN") return `/admin/stores/${notification.entityId}`;
    return "/vendor";
  }
  return "/orders";
};

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const hasUnread = unreadCount > 0;
  const displayedCount = useMemo(
    () => (unreadCount > 9 ? "9+" : String(unreadCount)),
    [unreadCount],
  );

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [items, count] = await Promise.all([
        getMyNotifications(),
        getUnreadNotificationCount(),
      ]);
      setNotifications(items);
      setUnreadCount(count);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to load notifications"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    void Promise.resolve().then(() => refresh());

    const channel = supabase
      .channel(`notifications:${user.id || user._id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id || user._id}`,
        },
        () => {
          refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?._id]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  if (!user) return null;

  const handleOpenNotification = async (notification: Notification) => {
    try {
      if (!notification.readAt) {
        await markNotificationRead(notification.id);
        setUnreadCount((count) => Math.max(0, count - 1));
        setNotifications((items) =>
          items.map((item) =>
            item.id === notification.id
              ? { ...item, readAt: new Date().toISOString() }
              : item,
          ),
        );
      }
      setOpen(false);
      navigate(notificationPath(notification));
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to update notification"));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setUnreadCount(0);
      setNotifications((items) =>
        items.map((item) => ({ ...item, readAt: item.readAt || now })),
      );
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to mark notifications read"));
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-xl p-2 transition-colors hover:bg-app-cream"
        aria-label={`Notifications${hasUnread ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <BellIcon className="size-5 text-zinc-900" />
        {hasUnread && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-app-orange text-[9px] font-bold text-white">
            {displayedCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2.5 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-app-border bg-white shadow-xl animate-fade-in"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Notifications</p>
              <p className="text-xs text-app-text-light">
                {hasUnread ? `${unreadCount} unread` : "All caught up"}
              </p>
            </div>
            {hasUnread && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-app-green hover:bg-app-cream"
              >
                <CheckIcon className="size-3.5" />
                Mark read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-app-text-light">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <PackageIcon className="mx-auto mb-3 size-10 text-app-border" />
                <p className="text-sm font-semibold text-zinc-900">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs text-app-text-light">
                  Order and marketplace updates will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-app-border">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleOpenNotification(notification)}
                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-app-cream/70"
                  >
                    <span
                      className={`mt-1 size-2 rounded-full shrink-0 ${
                        notification.readAt ? "bg-transparent" : "bg-app-orange"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-zinc-900">
                        {notification.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-app-text-light">
                        {notification.message}
                      </span>
                      <span className="mt-1 block text-[11px] font-medium text-zinc-400">
                        {relativeTime(notification.createdAt)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
