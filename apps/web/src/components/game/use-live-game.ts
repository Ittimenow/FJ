"use client";

import { realtimeEvents } from "@cashflow/shared";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { publicApiBaseUrl, publicSocketBaseUrl, publicSocketPath } from "@/lib/api";
import {
  checkConnection as runConnectionCheck,
  initialConnectionDiagnostics,
  phaseFromConnectError,
  phaseFromDisconnect,
  reportConnectionIssue,
  socketOptions,
  type ConnectionDiagnostics
} from "@/lib/connection-health";
import type { GameSnapshot } from "@/lib/types";

type ActionResult = { snapshot?: GameSnapshot; message?: string };

export function useLiveGame(initialSnapshot: GameSnapshot, token: string) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [connection, setConnection] = useState<ConnectionDiagnostics>(
    initialConnectionDiagnostics
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const lastDiagnosticReportRef = useRef(0);

  useEffect(() => {
    const socket = io(`${publicSocketBaseUrl()}/games`, {
      ...socketOptions(token),
      path: publicSocketPath()
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      setConnection((current) => ({
        ...current,
        phase: "connected",
        lastConnectedAt: new Date().toISOString(),
        lastDisconnectReason: null,
        reconnectAttempt: 0
      }));
      setError(null);
      socket.emit("game:join", { gameId: initialSnapshot.game.id });
      void refreshConnection(socket);
    });
    socket.io.on("reconnect_attempt", (attempt) => {
      setConnection((current) => ({
        ...current,
        phase: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "reconnecting",
        reconnectAttempt: attempt
      }));
    });
    socket.on("disconnect", (reason) => {
      setConnection((current) => {
        const next = {
          ...current,
          phase: phaseFromDisconnect(reason, navigator.onLine),
          lastDisconnectReason: reason
        };
        reportOnce("socket_disconnect", `Игровой канал отключён: ${reason}`, next);
        return next;
      });
    });
    socket.on(realtimeEvents.stateUpdate, (value: GameSnapshot) => {
      if (value?.game?.id) {
        setSnapshot(value);
        setError(null);
      }
    });
    socket.on("connect_error", (caught) => {
      setConnection((current) => {
        const next = {
          ...current,
          phase: phaseFromConnectError(caught, navigator.onLine),
          lastDisconnectReason: caught.message
        };
        reportOnce("socket_connect_error", caught.message, next);
        return next;
      });
      setError(
        phaseFromConnectError(caught, navigator.onLine) === "session_expired"
          ? "Сессия истекла. Войдите в аккаунт заново."
          : "Игровой сервер пока недоступен. Переподключение выполняется автоматически."
      );
    });
    const handleOffline = () => {
      setConnection((current) => ({ ...current, phase: "offline" }));
    };
    const handleOnline = () => {
      setConnection((current) => ({ ...current, phase: "reconnecting" }));
      socket.connect();
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    socket.on("game:deleted", () => setError("Партия была удалена. Вернитесь в личный кабинет."));
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [initialSnapshot.game.id, token]);

  async function refreshConnection(socket = socketRef.current) {
    setConnection((current) => ({ ...current, checking: true }));
    const result = await runConnectionCheck(socket);
    setConnection((current) => ({ ...current, ...result, checking: false }));
  }

  function reportOnce(
    kind: "socket_connect_error" | "socket_disconnect",
    message: string,
    diagnostics: ConnectionDiagnostics
  ) {
    const now = Date.now();
    if (now - lastDiagnosticReportRef.current < 60_000) return;
    lastDiagnosticReportRef.current = now;
    void reportConnectionIssue({
      token,
      gameId: initialSnapshot.game.id,
      kind,
      message,
      diagnostics
    });
  }

  async function changeTimeline(action: "pause" | "resume") {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${publicApiBaseUrl()}/api/games/${snapshot.game.id}/${action}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10_000)
        }
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

  return {
    snapshot,
    connected: connection.phase === "connected",
    connection,
    checkConnection: () => refreshConnection(),
    loading,
    error,
    changeTimeline
  };
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
