import type { GamePlayer } from "./types";

export function gamePlayerName(player: GamePlayer | null | undefined) {
  return player?.user?.displayName ?? player?.guestName ?? "Игрок";
}

export function unresolvedStockSellerNames(
  players: GamePlayer[],
  sellerGamePlayerIds: string[],
  resolvedGamePlayerIds: string[]
) {
  const playersById = new Map(players.map((player) => [player.id, player]));

  return sellerGamePlayerIds
    .filter((gamePlayerId) => !resolvedGamePlayerIds.includes(gamePlayerId))
    .map((gamePlayerId) => gamePlayerName(playersById.get(gamePlayerId)));
}
