"use client";

import {
  Bot,
  CircleDot,
  Clock3,
  MessageCircle,
  Pause,
  Play,
  Send,
  Trash2,
  X
} from "lucide-react";
import {
  createContext,
  FormEvent,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";
import { RoomInviteActions } from "@/components/game/room-invite-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { shortDate } from "@/lib/format";
import { gameStatusLabel } from "@/lib/game-labels";
import type { ChatMessage } from "@/lib/types";
import {
  connectionPresentation,
  type ConnectionDiagnostics
} from "@/lib/connection-health";

export interface GameRoomHeaderState {
  gameId: string;
  currentUserId: string;
  title: string;
  status: string;
  connected: boolean;
  connection: ConnectionDiagnostics;
  code: string;
  isSolo: boolean;
  currentRound: number;
  currentPlayerName: string | null;
  currentPeriod: number;
  periodCount: number;
  remainingSeconds: number | null;
  timelineLoading: boolean;
  startsNextPeriod: boolean;
  chatMessages: ChatMessage[];
  onSendChat: (body: string) => void;
  onPause: (() => void) | null;
  onResume: (() => void) | null;
  onDeleteGame: (() => void) | null;
  onCheckConnection: () => void;
}

const GameRoomHeaderContext = createContext<{
  state: GameRoomHeaderState | null;
  setState: (state: GameRoomHeaderState | null) => void;
} | null>(null);

export function GameRoomHeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameRoomHeaderState | null>(null);
  const value = useMemo(() => ({ state, setState }), [state]);

  return (
    <GameRoomHeaderContext.Provider value={value}>
      {children}
    </GameRoomHeaderContext.Provider>
  );
}

export function useSetGameRoomHeader() {
  const context = useContext(GameRoomHeaderContext);
  if (!context) throw new Error("useSetGameRoomHeader must be used inside GameRoomHeaderProvider");
  return context.setState;
}

export function GameRoomHeaderSlot() {
  const context = useContext(GameRoomHeaderContext);
  const state = context?.state ?? null;

  return (
    <div className="flex min-w-0 justify-center">
      {state ? (
        <div className="flex max-w-full items-center gap-1.5 text-xs text-muted sm:gap-2">
          <MobileTimelineControl state={state} />
          {state.remainingSeconds !== null ? (
            <span
              className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-card px-2.5 py-2 font-extrabold tabular-nums text-ink md:inline-flex"
              aria-label={timelineAriaLabel(state)}
            >
              <Clock3 size={14} aria-hidden="true" />
              {formatRemainingTime(state.remainingSeconds)}
            </span>
          ) : null}
          <GameChatControl
            gameId={state.gameId}
            currentUserId={state.currentUserId}
            messages={state.chatMessages}
            onSend={state.onSendChat}
          />
          {state.status !== "WAITING" && state.status !== "ENDED" ? (
            <span className="hidden shrink-0 rounded-lg bg-card px-2.5 py-2 font-bold text-ink md:inline">
              Период {state.currentPeriod}/{state.periodCount}
            </span>
          ) : null}
          {state.onPause ? (
            <button
              type="button"
              onClick={state.onPause}
              disabled={state.timelineLoading}
              className="hidden h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-card px-2.5 font-extrabold text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 disabled:cursor-wait disabled:opacity-60 md:inline-flex"
              aria-label="Поставить игру на паузу"
            >
              <Pause size={14} aria-hidden="true" />
              <span className="hidden xl:inline">Пауза</span>
            </button>
          ) : null}
          {state.onResume ? (
            <button
              type="button"
              onClick={state.onResume}
              disabled={state.timelineLoading}
              className="hidden h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-action px-2.5 font-extrabold text-ink shadow-[0_8px_20px_rgba(249,143,47,.22)] transition hover:-translate-y-0.5 hover:bg-[#e77b1e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-journey/25 disabled:cursor-wait disabled:opacity-60 disabled:shadow-none md:inline-flex"
              aria-label={state.startsNextPeriod ? "Начать следующий период" : "Продолжить игру"}
            >
              <Play size={14} aria-hidden="true" />
              <span className="hidden xl:inline">
                {state.startsNextPeriod ? "Следующий период" : "Продолжить"}
              </span>
            </button>
          ) : null}
          <div className="md:hidden">
            <ConnectionStatusControl state={state} />
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {state.status === "ENDED" ? (
              <span className="rounded-lg bg-card px-3 py-2 font-bold text-ink">
                Партия завершена
              </span>
            ) : (
              <>
                <span className="hidden max-w-44 truncate font-bold text-ink xl:inline">
                  {state.title}
                </span>
                {state.isSolo ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#eee8ff] px-2.5 py-2 font-extrabold text-[#6443b4]">
                    <Bot size={14} aria-hidden="true" />
                    С ботами
                  </span>
                ) : (
                  <RoomInviteActions code={state.code} />
                )}
                <span className="hidden shrink-0 rounded-lg bg-card px-2.5 py-2 font-bold text-ink lg:inline">
                  {gameStatusLabel(state.status)}
                </span>
                <ConnectionStatusControl state={state} />
                <span className="hidden shrink-0 rounded-lg bg-card px-2.5 py-2 font-bold text-ink xl:inline">
                  Раунд {state.currentRound}
                </span>
                {state.currentPlayerName ? (
                  <span className="min-w-0 truncate rounded-lg bg-[#fff0df] px-2.5 py-2 font-extrabold text-[#8a3d0a]">
                    Ход: {state.currentPlayerName}
                  </span>
                ) : null}
              </>
            )}
            {state.onDeleteGame ? (
              <button
                type="button"
                onClick={state.onDeleteGame}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-red-700 transition hover:bg-red-50"
                aria-label="Удалить игру"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ConnectionStatusControl({ state }: { state: GameRoomHeaderState }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const presentation = connectionPresentation(state.connection.phase);
  const toneClass = {
    neutral: "bg-[#e8effe] text-journey",
    success: "bg-[#eaf3e0] text-success",
    warning: "bg-[#fff0df] text-[#8a3d0a]",
    danger: "bg-red-50 text-red-700"
  }[presentation.tone];

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/30 ${toneClass}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${presentation.label}. Открыть диагностику соединения`}
      >
        <CircleDot size={12} aria-hidden="true" />
        <span className="hidden lg:inline">{presentation.label}</span>
      </button>
      {open ? (
        <section
          role="dialog"
          aria-label="Диагностика соединения"
          className="absolute right-0 top-[calc(100%+10px)] z-[80] w-[min(340px,calc(100vw-24px))] rounded-2xl bg-white p-4 text-left text-ink shadow-[0_18px_48px_rgba(23,36,63,.2)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-extrabold">{presentation.label}</h2>
              <p className="mt-1 text-sm leading-5 text-muted">{presentation.detail}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-card hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/30"
              aria-label="Закрыть диагностику"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-card p-3 text-sm">
            <ConnectionMetric label="API" value={latencyText(state.connection.apiLatencyMs)} />
            <ConnectionMetric label="Игровой канал" value={latencyText(state.connection.socketLatencyMs)} />
            <ConnectionMetric
              label="Попытка подключения"
              value={state.connection.reconnectAttempt ? String(state.connection.reconnectAttempt) : "—"}
            />
            <ConnectionMetric
              label="Последняя проверка"
              value={checkedAtText(state.connection.lastCheckedAt)}
            />
          </dl>
          <button
            type="button"
            onClick={state.onCheckConnection}
            disabled={state.connection.checking}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-journey px-4 font-extrabold text-white transition hover:bg-[#1f56c8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/30 disabled:cursor-wait disabled:opacity-60"
          >
            {state.connection.checking ? "Проверяем…" : "Проверить соединение"}
          </button>
        </section>
      ) : null}
    </div>
  );
}

function ConnectionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="mt-1 truncate font-extrabold text-ink">{value}</dd>
    </div>
  );
}

function latencyText(value: number | null) {
  return value === null ? "Нет ответа" : `${value} мс`;
}

function checkedAtText(value: string | null) {
  if (!value) return "Ещё не было";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function MobileTimelineControl({ state }: { state: GameRoomHeaderState }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const canControl = Boolean(state.onPause || state.onResume);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (state.remainingSeconds === null) return null;

  return (
    <div ref={rootRef} className="relative md:hidden">
      {canControl ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-xl bg-card px-1.5 font-extrabold tabular-nums text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 min-[360px]:px-2"
          aria-label={timelineAriaLabel(state)}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Clock3 className="hidden min-[360px]:block" size={14} aria-hidden="true" />
          <span>{formatRemainingTime(state.remainingSeconds)}</span>
        </button>
      ) : (
        <span
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-xl bg-card px-1.5 font-extrabold tabular-nums text-ink min-[360px]:px-2"
          aria-label={timelineAriaLabel(state)}
        >
          <Clock3 className="hidden min-[360px]:block" size={14} aria-hidden="true" />
          <span>{formatRemainingTime(state.remainingSeconds)}</span>
        </span>
      )}
      {open && canControl ? (
        <div
          role="dialog"
          aria-label="Управление временем партии"
          className="absolute left-0 top-[calc(100%+.5rem)] z-[70] w-56 rounded-xl bg-white p-3 text-left shadow-[0_18px_48px_rgba(5,18,45,.2)]"
        >
          <div className="text-xs font-bold text-muted">
            Период {state.currentPeriod}/{state.periodCount}
          </div>
          <div className="mt-1 text-sm font-extrabold tabular-nums text-ink">
            {formatRemainingTime(state.remainingSeconds)}
          </div>
          {state.onPause ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full gap-2"
              onClick={() => {
                setOpen(false);
                state.onPause?.();
              }}
              disabled={state.timelineLoading}
            >
              <Pause size={16} aria-hidden="true" />
              Поставить на паузу
            </Button>
          ) : null}
          {state.onResume ? (
            <Button
              type="button"
              variant="action"
              className="mt-3 w-full gap-2"
              onClick={() => {
                setOpen(false);
                state.onResume?.();
              }}
              disabled={state.timelineLoading}
            >
              <Play size={16} aria-hidden="true" />
              {state.startsNextPeriod ? "Следующий период" : "Продолжить"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function GameChatControl({
  gameId,
  currentUserId,
  messages,
  onSend
}: {
  gameId: string;
  currentUserId: string;
  messages: ChatMessage[];
  onSend: (body: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const knownGameIdRef = useRef<string | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (knownGameIdRef.current !== gameId) {
      knownGameIdRef.current = gameId;
      knownMessageIdsRef.current = new Set(messages.map((message) => message.id));
      setUnreadCount(0);
      setOpen(false);
      return;
    }

    const newUnreadCount = messages.filter(
      (message) =>
        !knownMessageIdsRef.current.has(message.id) &&
        message.user?.id !== currentUserId
    ).length;
    knownMessageIdsRef.current = new Set(messages.map((message) => message.id));
    if (open) {
      setUnreadCount(0);
    } else if (newUnreadCount > 0) {
      setUnreadCount((count) => count + newUnreadCount);
    }
  }, [currentUserId, gameId, messages, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = String(new FormData(event.currentTarget).get("body") ?? "").trim();
    if (!body) return;
    onSend(body);
    event.currentTarget.reset();
  }

  const orderedMessages = [...messages].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setUnreadCount(0);
        }}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
        aria-label={unreadCount > 0 ? `Открыть чат, непрочитанных сообщений: ${unreadCount}` : "Открыть чат"}
        title="Чат"
      >
        <MessageCircle size={19} aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            className="absolute right-0.5 top-0.5 inline-flex min-w-4 justify-center rounded-full bg-action px-1 text-[9px] font-extrabold leading-4 text-ink"
            aria-hidden="true"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="app-shell-overlay fixed inset-0 z-[90] overflow-y-auto bg-[#07152d]/55 px-3 py-3 sm:grid sm:place-items-center sm:px-6 sm:py-8"
              onMouseDown={(event) => {
                if (event.target !== event.currentTarget) return;
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="game-chat-title"
                className="app-shell-overlay-panel mx-auto my-auto flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-[0_34px_90px_rgba(5,18,45,.35)] sm:p-5"
              >
                <div className="flex shrink-0 items-center justify-between gap-3">
                  <h2 id="game-chat-title" className="text-lg font-extrabold text-ink">Чат</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      triggerRef.current?.focus();
                    }}
                    className="grid h-11 w-11 place-items-center rounded-xl text-muted transition hover:bg-card hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25"
                    aria-label="Закрыть чат"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
                <div className="app-shell-overlay-scroll mt-4 min-h-0 space-y-3" aria-live="polite">
                  {orderedMessages.length === 0 ? (
                    <div className="rounded-xl bg-card p-4 text-sm leading-6 text-muted">
                      Сообщений пока нет. Напишите первым, чтобы участники увидели сообщение в комнате.
                    </div>
                  ) : (
                    orderedMessages.map((message) => (
                      <div key={message.id} className="rounded-xl bg-surface p-3">
                        <div className="text-xs text-muted">
                          {message.user?.displayName ?? "Игрок"} · {shortDate(message.createdAt)}
                        </div>
                        <div className="mt-1 break-words text-sm text-ink">{message.body}</div>
                      </div>
                    ))
                  )}
                </div>
                <form className="mt-4 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-2" onSubmit={submit}>
                  <Input name="body" placeholder="Сообщение" autoComplete="off" className="min-w-0" autoFocus />
                  <Button type="submit" aria-label="Отправить сообщение" className="w-11 px-0">
                    <Send size={16} aria-hidden="true" />
                  </Button>
                </form>
              </section>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function timelineAriaLabel(state: GameRoomHeaderState) {
  return `${state.status === "PAUSED" ? "Таймер периода остановлен, осталось" : `До конца периода ${state.currentPeriod} осталось`} ${formatRemainingTime(state.remainingSeconds ?? 0)}`;
}

function formatRemainingTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
