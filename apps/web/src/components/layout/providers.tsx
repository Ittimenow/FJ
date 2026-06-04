"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { GameRoomHeaderProvider } from "./game-room-header-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <GameRoomHeaderProvider>{children}</GameRoomHeaderProvider>
    </SessionProvider>
  );
}
