import type { GamePlayer } from "./types";

export function gamePlayerName(player: GamePlayer | null | undefined) {
  return player?.user?.displayName ?? player?.guestName ?? "Игрок";
}
