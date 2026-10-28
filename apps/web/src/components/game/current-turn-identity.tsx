"use client";

import { gamePlayerName } from "@/lib/game-player";
import type { GamePlayer } from "@/lib/types";
import { GamePlayerMark } from "./game-player-mark";
import "./current-turn-identity.css";

export function CurrentTurnIdentity({ player, isMine }: { player: GamePlayer; isMine: boolean }) {
  const name = gamePlayerName(player);
  return <div className="current-turn-identity flex min-w-0 items-center gap-1.5" role="status" aria-live="polite" aria-label={`Сейчас ходит ${name}`}>
    <span className="current-turn-identity-icon shrink-0" aria-hidden="true"><GamePlayerMark player={player} size="sm" className="h-7 w-7" /></span>
    <span className="min-w-0">
      <h3 className="text-xs font-semibold leading-4">{isMine ? "Ваш ход" : "Ходит"}</h3>
      <span className="block max-w-full truncate text-xs font-bold leading-4" title={name}>{name}</span>
    </span>
  </div>;
}
