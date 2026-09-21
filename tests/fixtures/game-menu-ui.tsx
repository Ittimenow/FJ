import React, { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../apps/web/src/components/layout/app-shell";
import { GameRoomHeaderProvider, useSetGameRoomHeader } from "../../apps/web/src/components/layout/game-room-header-context";
import { initialConnectionDiagnostics } from "../../apps/web/src/lib/connection-health";
import { gameChatNotices } from "../../apps/api/src/games/game-chat-notices";
import type { ChatMessage } from "../../apps/web/src/lib/types";

function MenuContent({ children }: { children?: React.ReactNode }) {
  const setHeader = useSetGameRoomHeader();
  const role = new URLSearchParams(location.search).get("role") ?? "host";
  const [status, setStatus] = useState("IN_PROGRESS");
  const [track, setTrack] = useState<"RAT_RACE" | "FAST_TRACK">("FAST_TRACK");
  const [events, setEvents] = useState([{ id: "start", type: "game:started", createdAt: new Date("2026-09-20T10:01:00Z"), gamePlayerId: null, payload: {} }]);
  const [sent, setSent] = useState<ChatMessage[]>([]);
  const [sync, setSync] = useState(0);
  const messages = useMemo<ChatMessage[]>(() => [
    ...gameChatNotices({ id: "synthetic", isTest: true, createdAt: new Date("2026-09-20T10:00:00Z") }, events, [])
      .map((message) => ({ ...message, createdAt: message.createdAt.toISOString() })),
    ...sent
  ], [events, sent, sync]);
  useEffect(() => {
    function changeStatus(next: string) {
      setStatus(next);
      setEvents((current) => [...current, { id: `event-${current.length}`, type: next === "PAUSED" ? "game:paused" : "game:resumed", createdAt: new Date(), gamePlayerId: null, payload: {} }]);
    }
    setHeader({
      gameId: "synthetic", currentUserId: "admin", title: "Вечерняя партия", code: "5C8G8M", status,
      connected: true, connection: { ...initialConnectionDiagnostics(), phase: "connected" }, isSolo: role === "solo",
      currentPeriod: 1, periodCount: 4, remainingSeconds: null, timelineLoading: false, startsNextPeriod: false,
      chatMessages: messages, hostDisplayView: role === "host" ? "classic" : null,
      trackView: track, onTrackChange: setTrack,
      onSendChat: (body) => setSent((current) => [...current, { id: `human-${current.length}`, body, createdAt: new Date().toISOString(), user: { id: "admin", displayName: "Макс" } }]),
      onPause: role !== "player" && status === "IN_PROGRESS" ? () => changeStatus("PAUSED") : null,
      onResume: role !== "player" && status === "PAUSED" ? () => changeStatus("IN_PROGRESS") : null,
      onCheckConnection: () => {}
    });
  }, [setHeader, messages, status, role, track]);
  return <AppShell userName="Макс" userInitials="М" gameViewportMode={children ? "classic" : null}>
    {children ? <div className="game-room game-room--classic-active game-room--fast-track-active">{children}</div> : null}
    <p>Демонстрационная партия</p>
    <output aria-label="Открытый круг">{track}</output>
    <button type="button" onClick={() => setSync((value) => value + 1)}>Синхронизировать</button>
  </AppShell>;
}

export function GameMenuFixture({ children }: { children?: React.ReactNode }) {
  return <GameRoomHeaderProvider><MenuContent>{children}</MenuContent></GameRoomHeaderProvider>;
}
