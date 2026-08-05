"use client";

import { realtimeEvents } from "@cashflow/shared";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { publicApiBaseUrl, publicSocketBaseUrl, publicSocketPath } from "@/lib/api";
import type { GameSnapshot } from "@/lib/types";

type ActionResult = { snapshot?: GameSnapshot; message?: string };

export function useLiveGame(initialSnapshot: GameSnapshot, token: string) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(`${publicSocketBaseUrl()}/games`, {
      auth: { token },
      path: publicSocketPath(),
      transports: ["websocket"]
    });
    socket.on("connect", () => {
      setConnected(true);
      setError(null);
      socket.emit("game:join", { gameId: initialSnapshot.game.id });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on(realtimeEvents.stateUpdate, (value: GameSnapshot) => {
      if (value?.game?.id) {
        setSnapshot(value);
        setError(null);
      }
    });
    socket.on("connect_error", () => setError("Нет связи с партией. Проверьте подключение."));
    socket.on("game:deleted", () => setError("Партия была удалена. Вернитесь в личный кабинет."));
    return () => {
      socket.disconnect();
    };
  }, [initialSnapshot.game.id, token]);

  async function changeTimeline(action: "pause" | "resume") {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${publicApiBaseUrl()}/api/games/${snapshot.game.id}/${action}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const result = (await response.json()) as ActionResult;
      if (!response.ok) throw new Error(result.message ?? "Не удалось изменить состояние партии");
      if (result.snapshot) setSnapshot(result.snapshot);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось изменить состояние партии");
    } finally {
      setLoading(false);
    }
  }

  return { snapshot, connected, loading, error, changeTimeline };
}

export function useRemainingSeconds(snapshot: GameSnapshot) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const deadline = snapshot.game.periodDeadlineAt ?? snapshot.game.deadlineAt;
    if (snapshot.game.status === "PAUSED") {
      setRemaining(snapshot.game.remainingPeriodSeconds ?? 0);
      return;
    }
    if (!deadline || snapshot.game.status !== "IN_PROGRESS") {
      setRemaining(null);
      return;
    }
    const update = () => {
      setRemaining(Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)));
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [
    snapshot.game.deadlineAt,
    snapshot.game.periodDeadlineAt,
    snapshot.game.remainingPeriodSeconds,
    snapshot.game.status
  ]);

  return remaining;
}

export function formatGameTime(seconds: number | null) {
  if (seconds === null) return "Без таймера";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
