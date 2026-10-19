import React from "react";
import { createRoot } from "react-dom/client";
import { NotificationBell } from "../../apps/web/src/components/layout/notification-bell";
import { NotificationUnreadProvider } from "../../apps/web/src/components/layout/notification-unread-provider";

createRoot(document.getElementById("root")!).render(
  <NotificationUnreadProvider>
    <header className="app-shell-header sticky top-0 z-[100]">
      <div className="app-shell-header-content flex min-h-16 items-center justify-end rounded-2xl bg-card px-3"><NotificationBell /></div>
    </header>
    <main className="p-5">Текущий экран игры</main>
  </NotificationUnreadProvider>
);
