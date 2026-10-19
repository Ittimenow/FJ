"use client";

import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUnreadNotifications } from "./notification-unread-provider";
import { NotificationPopover } from "./notification-popover";

export function NotificationBell() {
  const count = useUnreadNotifications();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const show = useCallback((returnFocus?: HTMLElement | null) => {
    returnFocusRef.current = returnFocus ?? buttonRef.current;
    setOpen(true);
  }, []);
  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    const target = returnFocusRef.current;
    if (restoreFocus && target?.isConnected) requestAnimationFrame(() => target.focus());
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("notifications") === "1") show();
    const onOpen = (event: Event) => show((event as CustomEvent<HTMLElement | null>).detail);
    const onWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "OPEN_NOTIFICATIONS") show();
    };
    window.addEventListener("notifications:open", onOpen);
    navigator.serviceWorker?.addEventListener("message", onWorkerMessage);
    return () => {
      window.removeEventListener("notifications:open", onOpen);
      navigator.serviceWorker?.removeEventListener("message", onWorkerMessage);
    };
  }, [show]);

  const label = count > 0 ? `Оповещения, непрочитанных: ${count}` : "Оповещения";
  return <>
    <button ref={buttonRef} type="button" aria-label={label} title={label} aria-expanded={open} aria-haspopup="dialog"
      onClick={() => open ? close() : show()}
      className="app-shell-notifications-link relative grid h-11 w-11 place-items-center rounded-xl text-muted transition hover:bg-white hover:text-journey focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">
      <Bell size={20} aria-hidden="true" />
      {count > 0 ? <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-journey px-1 text-[10px] font-extrabold leading-none text-white">{count > 99 ? "99+" : count}</span> : null}
    </button>
    <NotificationPopover open={open} onClose={close} />
  </>;
}
