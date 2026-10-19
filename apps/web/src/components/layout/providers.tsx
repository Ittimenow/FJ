"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { GameRoomHeaderProvider } from "./game-room-header-context";
import { NotificationUnreadProvider } from "./notification-unread-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <NotificationUnreadProvider>
        <GameRoomHeaderProvider>{children}</GameRoomHeaderProvider>
      </NotificationUnreadProvider>
    </SessionProvider>
  );
}
