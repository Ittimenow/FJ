"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";

export interface GameRoomHeaderState {
  title: string;
  status: string;
  connected: boolean;
  code: string;
  currentRound: number;
  currentPlayerName: string | null;
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
    <div className="hidden min-w-0 justify-center md:flex">
      {state ? (
        <div className="flex max-w-full items-center gap-2 text-xs text-neutral-600">
          <span className="truncate font-medium text-ink">{state.title}</span>
          <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 font-medium text-ink">
            {state.status}
          </span>
          <span
            className={[
              "shrink-0 rounded px-1.5 py-0.5 font-medium",
              state.connected ? "bg-green-100 text-success" : "bg-red-100 text-red-700"
            ].join(" ")}
          >
            {state.connected ? "online" : "offline"}
          </span>
          <span className="min-w-0 truncate">
            Код: <span className="font-mono text-ink">{state.code}</span> · Раунд{" "}
            {state.currentRound}
            {state.currentPlayerName ? ` · Ход: ${state.currentPlayerName}` : ""}
          </span>
          {state.onDeleteGame ? (
            <button
              type="button"
              onClick={state.onDeleteGame}
              className="shrink-0 rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200"
            >
              Удалить игру
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
