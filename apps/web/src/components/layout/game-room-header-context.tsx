"use client";

import { CircleDot, Clock3, Pause, Play, Trash2 } from "lucide-react";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { RoomInviteActions } from "@/components/game/room-invite-actions";
import { gameStatusLabel } from "@/lib/game-labels";

export interface GameRoomHeaderState {
  title: string;
  status: string;
  connected: boolean;
  code: string;
  currentRound: number;
  currentPlayerName: string | null;
  currentPeriod: number;
  periodCount: number;
  remainingSeconds: number | null;
  timelineLoading: boolean;
  startsNextPeriod: boolean;
  onPause: (() => void) | null;
  onResume: (() => void) | null;
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

  return (
    <div className="flex min-w-0 justify-center">
      {state ? (
        <div className="flex max-w-full items-center gap-2 text-xs text-muted">
          {state.remainingSeconds !== null ? (
            <span
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-card px-2.5 py-2 font-extrabold tabular-nums text-ink"
              aria-label={`${state.status === "PAUSED" ? "Таймер периода остановлен, осталось" : `До конца периода ${state.currentPeriod} осталось`} ${formatRemainingTime(state.remainingSeconds)}`}
            >
              <Clock3 size={14} aria-hidden="true" />
              {formatRemainingTime(state.remainingSeconds)}
            </span>
          ) : null}
          {state.status !== "WAITING" && state.status !== "ENDED" ? (
            <span className="hidden shrink-0 rounded-lg bg-card px-2.5 py-2 font-bold text-ink sm:inline">
              Период {state.currentPeriod}/{state.periodCount}
            </span>
          ) : null}
          {state.onPause ? (
            <button
              type="button"
              onClick={state.onPause}
              disabled={state.timelineLoading}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-card px-2.5 font-extrabold text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-action/25 disabled:cursor-wait disabled:opacity-60"
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
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-action px-2.5 font-extrabold text-ink shadow-[0_8px_20px_rgba(249,143,47,.22)] transition hover:-translate-y-0.5 hover:bg-[#e77b1e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-journey/25 disabled:cursor-wait disabled:opacity-60 disabled:shadow-none"
              aria-label={state.startsNextPeriod ? "Начать следующий период" : "Продолжить игру"}
            >
              <Play size={14} aria-hidden="true" />
              <span className="hidden xl:inline">
                {state.startsNextPeriod ? "Следующий период" : "Продолжить"}
              </span>
            </button>
          ) : null}
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
    </div>
  );
}

function formatRemainingTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
