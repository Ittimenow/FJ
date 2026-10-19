"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useUnreadNotifications } from "./notification-unread-provider";

export function NotificationBell() {
  const count = useUnreadNotifications();
  const label = count > 0 ? `Оповещения, непрочитанных: ${count}` : "Оповещения";
  return (
    <Link href={"/notifications" as Route} aria-label={label} title={label}
      className="app-shell-notifications-link relative grid h-11 w-11 place-items-center rounded-xl text-muted transition hover:bg-white hover:text-journey focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25">
      <Bell size={20} aria-hidden="true" />
      {count > 0 ? <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-journey px-1 text-[10px] font-extrabold leading-none text-white">{count > 99 ? "99+" : count}</span> : null}
    </Link>
  );
}
