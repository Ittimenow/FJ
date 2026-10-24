"use client";

import { X } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { publicApiBaseUrl } from "@/lib/api";
import { formatGameTime } from "@/lib/time-zones";
import type { NotificationsResponse, ProfileResponse } from "@/lib/types";
import { useNotificationRead } from "./notification-unread-provider";

type Notification = NotificationsResponse["items"][number];

export function NotificationPopover({ open, onClose }: { open: boolean; onClose: (restoreFocus?: boolean) => void }) {
  const token = useSession().data?.accessToken;
  const notificationRead = useNotificationRead();
  const [items, setItems] = useState<Notification[]>([]);
  const [timeZone, setTimeZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pendingRef = useRef(new Set<string>());
  const completedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!open || !token) return;
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([
      fetch(`${publicApiBaseUrl()}/api/users/me/notifications`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store"
      }).then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить оповещения.");
        return response.json() as Promise<NotificationsResponse>;
      }),
      fetch(`${publicApiBaseUrl()}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store"
      }).then(async (response) => {
        if (!response.ok) throw new Error("Не удалось загрузить оповещения.");
        return response.json() as Promise<ProfileResponse>;
      })
    ]).then(([notifications, profile]) => {
      if (!active) return;
      setItems(notifications.items);
      setTimeZone(profile.user.timeZone);
    }).catch(() => {
      if (active) setError("Не удалось загрузить оповещения. Закройте окно и попробуйте снова.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [open, token]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !(target as Element).closest?.(".app-shell-notifications-link")) onClose(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose]);

  const markRead = useCallback(async (id: string) => {
    if (!token || pendingRef.current.has(id) || completedRef.current.has(id)) return;
    pendingRef.current.add(id);
    try {
      const response = await fetch(`${publicApiBaseUrl()}/api/users/me/notifications/${id}/read`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Не удалось отметить сообщение прочитанным.");
      completedRef.current.add(id);
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
      notificationRead();
    } catch {
      setError("Не удалось отметить сообщение прочитанным. Закройте окно и попробуйте снова.");
    } finally {
      pendingRef.current.delete(id);
    }
  }, [token, notificationRead]);

  useEffect(() => {
    const root = listRef.current;
    if (!open || loading || error || !root || !items.some((item) => !item.readAt)) return;
    const observer = new IntersectionObserver((entries) => {
      if (document.visibilityState !== "visible") return;
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.999) {
          const id = (entry.target as HTMLElement).dataset.notificationId;
          if (id) void markRead(id);
        }
      }
    }, { root, threshold: [0.999, 1] });
    const observeUnread = () => root.querySelectorAll<HTMLElement>("[data-unread-notification]").forEach((card) => observer.observe(card));
    observeUnread();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        observer.disconnect();
        observeUnread();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
    };
  }, [open, loading, error, items, markRead]);

  if (!open) return null;
  return createPortal(<div ref={panelRef} role="dialog" aria-label="Оповещения" className="app-shell-notifications-panel flex flex-col rounded-2xl bg-card p-3 text-ink shadow-[0_18px_48px_rgba(5,18,45,.2)] sm:p-4">
    <div className="flex shrink-0 items-center justify-between gap-3 px-1 pb-3">
      <div><h2 className="text-lg font-extrabold">Оповещения</h2><p className="text-xs text-muted">Приглашения и изменения ваших партий</p></div>
      <button ref={closeRef} type="button" onClick={() => onClose()} aria-label="Закрыть оповещения" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"><X size={20} aria-hidden="true" /></button>
    </div>
    {loading ? <p className="px-2 py-5 text-sm text-muted">Загружаем оповещения…</p> : null}
    {error ? <p role="alert" className="mb-2 rounded-xl bg-[#fff0df] p-3 text-sm text-ink">{error}</p> : null}
    {!loading && !error && items.length === 0 ? <p className="px-2 py-5 text-sm text-muted">Сообщений пока нет. Здесь появятся приглашения и новости об играх.</p> : null}
    {!loading && !error && items.length > 0 ? <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 pb-1">
      {items.map((item) => <NotificationCard key={item.id} item={item} timeZone={timeZone} />)}
    </div> : null}
  </div>, document.body);
}

function NotificationCard({ item, timeZone }: { item: Notification; timeZone: string | null }) {
  const added = item.kind === "GAME_PLAYER_ADDED";
  const title = added ? "Вас добавили в игру" : item.kind === "OPEN_GAME_CANCELLED" ? "Игра отменена" : item.kind === "OPEN_GAME_RESCHEDULED" ? "Время игры изменено" : "Новая открытая игра";
  const href = item.game.status === "WAITING"
    ? item.kind === "OPEN_GAME_PUBLISHED" ? `/join/${item.game.code}` : `/games/${item.game.id}`
    : null;
  const content = <>
    <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 text-base font-extrabold">{title}</h3>{!item.readAt ? <span className="shrink-0 rounded-full bg-[#e8effe] px-2 py-1 text-xs font-bold text-journey">Новое</span> : null}</div>
    <p className="mt-1 break-words font-bold text-journey">{item.game.title}</p>
    <p className="mt-2 text-sm leading-6 text-muted">Ведущий: {item.game.createdBy?.displayName ?? "не указан"}. {item.game.status === "CANCELLED" ? "Партия отменена." : item.kind === "OPEN_GAME_CANCELLED" ? "Партия не состоится." : `Начало: ${item.game.scheduledAt ? formatGameTime(item.game.scheduledAt, timeZone) : "не указано"}.`}</p>
    <p className="mt-1 text-xs text-muted">Получено: {formatGameTime(item.createdAt, timeZone)}</p>
    {added && item.game.status !== "CANCELLED" ? <span className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-journey px-4 text-sm font-bold text-white">{item.game.status === "WAITING" ? "Перейти в лобби" : "Открыть игру"}</span> : href ? <Link href={href as Route} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-journey px-4 text-sm font-bold text-white hover:bg-[#1f56c8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">Открыть игру</Link> : null}
  </>;
  const cardClass = "block rounded-xl bg-white p-4 shadow-panel";
  if (added && item.game.status !== "CANCELLED") return <Link href={`/games/${item.game.id}` as Route} data-notification-id={item.id} data-unread-notification={item.readAt ? undefined : ""} className={`${cardClass} hover:bg-[#f5f8ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25`}>{content}</Link>;
  return <article data-notification-id={item.id} data-unread-notification={item.readAt ? undefined : ""} className={cardClass}>{content}</article>;
}
