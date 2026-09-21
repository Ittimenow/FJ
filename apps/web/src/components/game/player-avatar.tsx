"use client";

import type { GamePlayer } from "@/lib/types";
import { GamePlayerMark } from "./game-player-mark";

export function PlayerAvatar({ player, className }: { player: GamePlayer; className?: string }) {
  return <GamePlayerMark player={player} size="sm" className={className ?? "h-9 w-9"} />;
}
