import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SessionProvider } from "next-auth/react";
import { GameRoom } from "../../apps/web/src/components/game/game-room";
import { CreateSandboxForm } from "../../apps/web/src/components/game/create-sandbox-form";
import { AppShell } from "../../apps/web/src/components/layout/app-shell";
import { GameRoomHeaderProvider } from "../../apps/web/src/components/layout/game-room-header-context";
import { setRoomSnapshot } from "./socket";
import type { GameSnapshot } from "../../apps/web/src/lib/types";

function Fixture() {
  const [data, setData] = useState<{ snapshot: GameSnapshot; ownerId: string } | null>(null);
  useEffect(() => {
    const mode = new URLSearchParams(location.search).get("mode") ?? "101";
    void fetch(`/fixtures/${mode}`).then(response => response.json()).then(result => { setRoomSnapshot(result.snapshot);setData(result);document.documentElement.dataset.fixtureReady = "true"; });
  }, []);
  if (!data) return <p>Загружаем песочницу…</p>;
  return <SessionProvider session={null}><GameRoomHeaderProvider><AppShell userName="Администратор" gameViewportMode="classic">
    {new URLSearchParams(location.search).has("create") ? <CreateSandboxForm token="sandbox-verification" /> : <GameRoom initialSnapshot={data.snapshot} token="sandbox-verification" currentUserId={data.ownerId} currentUserRole="ADMIN" gameRoomView="classic" timeZone="Europe/Moscow" />}
  </AppShell></GameRoomHeaderProvider></SessionProvider>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
