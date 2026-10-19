"use client";

import { useSession } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { publicApiBaseUrl } from "@/lib/api";

const NotificationUnreadContext = createContext({ count: 0, notificationRead: () => {} });

export function useUnreadNotifications() {
  return useContext(NotificationUnreadContext).count;
}

export function useNotificationRead() {
  return useContext(NotificationUnreadContext).notificationRead;
}

export function NotificationUnreadProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [count, setCount] = useState(0);
  const [pushVersion, setPushVersion] = useState(0);

  const notificationRead = useCallback(() => {
    setCount((current) => Math.max(0, current - 1));
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("financial-journey-notifications");
      channel.postMessage("changed");
      channel.close();
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!token) {
      setCount(0);
      return;
    }
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/users/me/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store"
      });
      if (!response.ok) return;
      const result = await response.json() as { unreadCount: number };
      setCount(Math.max(0, result.unreadCount || 0));
    } catch {
      // A temporary network failure keeps the last known count.
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    if (!token) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15_000);
    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onChanged = () => {
      void refresh();
      channel?.postMessage("changed");
    };
    const onPush = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATIONS_CHANGED") onChanged();
    };
    const channel = typeof BroadcastChannel === "undefined"
      ? null : new BroadcastChannel("financial-journey-notifications");
    if (channel) channel.onmessage = () => void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("notifications:changed", onChanged);
    navigator.serviceWorker?.addEventListener("message", onPush);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("notifications:changed", onChanged);
      navigator.serviceWorker?.removeEventListener("message", onPush);
      channel?.close();
    };
  }, [token, refresh]);

  useEffect(() => {
    const onChanged = () => setPushVersion((version) => version + 1);
    window.addEventListener("push:subscription-changed", onChanged);
    return () => window.removeEventListener("push:subscription-changed", onChanged);
  }, []);

  useEffect(() => {
    if (status !== "unauthenticated" || !("serviceWorker" in navigator) ||
      !localStorage.getItem("financial-journey-push-user")) return;
    void navigator.serviceWorker.getRegistration().then(async (registration) => {
      await (await registration?.pushManager?.getSubscription())?.unsubscribe();
      localStorage.removeItem("financial-journey-push-user");
      setPushVersion((version) => version + 1);
    }).catch(() => {});
  }, [status]);

  useEffect(() => {
    const badgeNavigator = navigator as Navigator & {
      setAppBadge?: (value: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (!badgeNavigator.setAppBadge || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.getRegistration().then(async (registration) => {
      const subscribed = await registration?.pushManager?.getSubscription();
      if (token && subscribed && count > 0) await badgeNavigator.setAppBadge?.(count);
      else await badgeNavigator.clearAppBadge?.();
    }).catch(() => {});
  }, [token, count, pushVersion]);

  return <NotificationUnreadContext.Provider value={{ count, notificationRead }}>{children}</NotificationUnreadContext.Provider>;
}
