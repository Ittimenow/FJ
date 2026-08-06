import * as Sentry from "@sentry/nextjs";
import type { Socket } from "socket.io-client";
import { publicApiBaseUrl } from "./api";

export type ConnectionPhase =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "offline"
  | "server_unavailable"
  | "session_expired";

export interface ConnectionDiagnostics {
  phase: ConnectionPhase;
  apiLatencyMs: number | null;
  socketLatencyMs: number | null;
  lastCheckedAt: string | null;
  lastConnectedAt: string | null;
  lastDisconnectReason: string | null;
  reconnectAttempt: number;
  checking: boolean;
}

export interface ConnectionPresentation {
  label: string;
  detail: string;
  tone: "neutral" | "success" | "warning" | "danger";
}

export function initialConnectionDiagnostics(): ConnectionDiagnostics {
  return {
    phase: "connecting",
    apiLatencyMs: null,
    socketLatencyMs: null,
    lastCheckedAt: null,
    lastConnectedAt: null,
    lastDisconnectReason: null,
    reconnectAttempt: 0,
    checking: false
  };
}

export function connectionPresentation(phase: ConnectionPhase): ConnectionPresentation {
  if (phase === "connected") {
    return {
      label: "На связи",
      detail: "Игровые события синхронизируются в реальном времени.",
      tone: "success"
    };
  }
  if (phase === "connecting") {
    return {
      label: "Подключение",
      detail: "Устанавливаем защищённое соединение с партией.",
      tone: "neutral"
    };
  }
  if (phase === "reconnecting") {
    return {
      label: "Переподключение",
      detail: "Связь прервалась, повторяем подключение автоматически.",
      tone: "warning"
    };
  }
  if (phase === "offline") {
    return {
      label: "Нет интернета",
      detail: "Устройство сейчас не видит сеть. Проверьте Wi-Fi или мобильный интернет.",
      tone: "danger"
    };
  }
  if (phase === "session_expired") {
    return {
      label: "Сессия истекла",
      detail: "Войдите заново, чтобы восстановить синхронизацию партии.",
      tone: "danger"
    };
  }
  return {
    label: "Сервер недоступен",
    detail: "Интернет работает, но игровой сервер или канал обновлений не отвечает.",
    tone: "danger"
  };
}

export function phaseFromConnectError(error: unknown, online: boolean): ConnectionPhase {
  if (!online) return "offline";
  const code = socketErrorCode(error);
  if (code === "SESSION_EXPIRED" || code === "AUTH_FAILED") return "session_expired";
  return "server_unavailable";
}

export function phaseFromDisconnect(reason: string, online: boolean): ConnectionPhase {
  if (!online) return "offline";
  if (reason === "io server disconnect") return "server_unavailable";
  return "reconnecting";
}

export async function checkConnection(
  socket: Socket | null
): Promise<Pick<ConnectionDiagnostics, "phase" | "apiLatencyMs" | "socketLatencyMs" | "lastCheckedAt">> {
  const online = typeof navigator === "undefined" || navigator.onLine;
  if (!online) {
    return {
      phase: "offline",
      apiLatencyMs: null,
      socketLatencyMs: null,
      lastCheckedAt: new Date().toISOString()
    };
  }

  const [apiLatencyMs, socketLatencyMs] = await Promise.all([
    measureApiLatency(),
    measureSocketLatency(socket)
  ]);
  return {
    phase:
      apiLatencyMs === null || socketLatencyMs === null
        ? "server_unavailable"
        : "connected",
    apiLatencyMs,
    socketLatencyMs,
    lastCheckedAt: new Date().toISOString()
  };
}

export async function reportConnectionIssue({
  token,
  gameId,
  kind,
  message,
  diagnostics
}: {
  token: string;
  gameId: string;
  kind:
    | "socket_connect_error"
    | "socket_disconnect"
    | "socket_timeout"
    | "api_unavailable"
    | "client_error";
  message: string;
  diagnostics: ConnectionDiagnostics;
}) {
  Sentry.withScope((scope) => {
    scope.setTag("diagnostic.kind", kind);
    scope.setTag("connection.phase", diagnostics.phase);
    scope.setContext("connection", {
      gameId,
      apiLatencyMs: diagnostics.apiLatencyMs,
      socketLatencyMs: diagnostics.socketLatencyMs,
      reconnectAttempt: diagnostics.reconnectAttempt
    });
    Sentry.captureMessage(message, kind === "client_error" ? "error" : "warning");
  });

  try {
    await fetch(`${publicApiBaseUrl()}/api/diagnostics/client-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        kind,
        message: message.slice(0, 500),
        gameId,
        connectionState: diagnostics.phase,
        apiLatencyMs: diagnostics.apiLatencyMs,
        socketLatencyMs: diagnostics.socketLatencyMs
      }),
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    // The diagnostic endpoint may be the failed dependency; never block the game UI.
  }
}

export function socketOptions(token: string) {
  return {
    auth: { token },
    transports: ["websocket", "polling"] as Array<"websocket" | "polling">,
    tryAllTransports: true,
    reconnection: true,
    reconnectionAttempts: Number.POSITIVE_INFINITY,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 8000
  };
}

function measureApiLatency() {
  const startedAt = performance.now();
  return fetch(`${publicApiBaseUrl()}/api/health/ping`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000)
  })
    .then((response) => (response.ok ? Math.round(performance.now() - startedAt) : null))
    .catch(() => null);
}

function measureSocketLatency(socket: Socket | null) {
  if (!socket?.connected) return Promise.resolve(null);
  const startedAt = performance.now();
  return new Promise<number | null>((resolve) => {
    socket.timeout(5000).emit(
      "diagnostics:ping",
      (error: Error | null, response?: { status?: string }) => {
        resolve(!error && response?.status === "ok" ? Math.round(performance.now() - startedAt) : null);
      }
    );
  });
}

function socketErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return null;
  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== "object" || !("code" in data)) return null;
  return String((data as { code?: unknown }).code ?? "");
}
