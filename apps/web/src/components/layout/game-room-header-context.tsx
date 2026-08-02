"use client";

import { CircleDot, Clock3, Info, Trash2, X } from "lucide-react";
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from "react";
import { RoomInviteActions } from "@/components/game/room-invite-actions";
import { gameStatusLabel } from "@/lib/game-labels";

export interface GameRoomHeaderState {
  title: string;
  status: string;
  connected: boolean;
  code: string;
  currentRound: number;
  currentPlayerName: string | null;
  remainingSeconds: number | null;
  onDeleteGame: (() => void) | null;
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

  const [detailsOpen, setDetailsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!detailsOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [detailsOpen]);

  return (
    <div className="flex min-w-0 justify-center">
      {state ? (
        <div className="flex max-w-full items-center gap-2 text-xs text-muted">
          {state.remainingSeconds !== null ? (
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-card px-2.5 py-2 font-extrabold tabular-nums text-ink"
              aria-label={`До завершения партии осталось ${formatRemainingTime(state.remainingSeconds)}`}
            >
              <Clock3 size={14} aria-hidden="true" />
              {formatRemainingTime(state.remainingSeconds)}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 md:hidden"
            aria-label="Информация о партии"
            aria-haspopup="dialog"
            aria-expanded={detailsOpen}
          >
            <Info size={17} aria-hidden="true" />
          </button>
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
              <RoomInviteActions code={state.code} />
              <span className="hidden shrink-0 rounded-lg bg-card px-2.5 py-2 font-bold text-ink lg:inline">
                {gameStatusLabel(state.status)}
              </span>
              <span
                className={[
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 font-bold",
                  state.connected ? "bg-[#eaf3e0] text-success" : "bg-red-50 text-red-700"
                ].join(" ")}
              >
                <CircleDot size={12} aria-hidden="true" />
                <span className="hidden lg:inline">{state.connected ? "На связи" : "Нет связи"}</span>
              </span>
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
      {state && detailsOpen ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-ink/55 p-4 md:hidden"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-room-details-title"
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-ink p-4 text-white shadow-[0_34px_90px_rgba(5,18,45,.35)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 id="mobile-room-details-title" className="truncate text-lg font-extrabold">
                  {state.title}
                </h2>
                <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
                  <CircleDot size={13} className={state.connected ? "text-[#bad08c]" : "text-red-300"} aria-hidden="true" />
                  {state.connected ? "На связи" : "Нет связи"}
                  <span aria-hidden="true">·</span>
                  {gameStatusLabel(state.status)}
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setDetailsOpen(false)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/40"
                aria-label="Закрыть информацию о партии"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 text-sm">
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-xs text-white/60">Этап</div>
                <div className="mt-1 font-extrabold">{state.status === "WAITING" ? "Лобби" : `Раунд ${state.currentRound}`}</div>
              </div>
              <div className="rounded-xl bg-[#fff0df] p-3 text-[#8a3d0a]">
                <div className="text-xs opacity-70">Текущий ход</div>
                <div className="mt-1 truncate font-extrabold">{state.currentPlayerName ?? "Ожидаем"}</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/10 p-3 text-sm">
              <span>Код комнаты: <strong>{state.code}</strong></span>
              <RoomInviteActions code={state.code} tone="dark" />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function formatRemainingTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
