import assert from "node:assert/strict";
import test from "node:test";
import { unresolvedStockSellerNames } from "./game-player";
import type { GamePlayer } from "./types";

function player(id: string, displayName: string | null, guestName: string | null = null) {
  return {
    id,
    guestName,
    user: displayName ? { displayName } : null
  } as GamePlayer;
}

test("returns names of stock sellers who have not answered yet", () => {
  const players = [
    player("player-1", "Олег"),
    player("player-2", "Анна"),
    player("player-3", null, "Макс")
  ];

  assert.deepEqual(
    unresolvedStockSellerNames(
      players,
      ["player-1", "player-2", "player-3"],
      ["player-2"]
    ),
    ["Олег", "Макс"]
  );
});

test("keeps a fallback label when a seller is absent from the snapshot", () => {
  assert.deepEqual(unresolvedStockSellerNames([], ["missing-player"], []), ["Игрок"]);
});
