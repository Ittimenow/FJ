import assert from "node:assert/strict";
import test from "node:test";
import { gameTurns, latestGameTurn, playerGameStatus, turnsForPlayer } from "./game-journal";
import type { GameEvent, GamePlayer, GameSnapshot } from "@/lib/types";

function event(sequence: number, type: string, playerId?: string, payload = {}): GameEvent {
  return {
    id: `event-${sequence}`,
    sequence,
    type,
    payload,
    createdAt: "2026-08-05T10:00:00.000Z",
    gamePlayer: playerId ? { id: playerId, seat: 1, role: "PLAYER" } : null
  };
}

test("groups completed turns per player", () => {
  const events = [
    event(1, "player:roll_dice", "p1"),
    event(2, "player:move", "p1"),
    event(3, "state:update", undefined, { reason: "roll_resolved" }),
    event(4, "player:roll_dice", "p2")
  ];

  const turns = gameTurns(events);
  assert.equal(turns.length, 2);
  assert.equal(turns[0]?.complete, true);
  assert.equal(turns[1]?.complete, false);
  assert.equal(turnsForPlayer(events, "p1").length, 1);
});

test("prefers the open current turn for broadcast", () => {
  const snapshot = {
    events: [
      event(1, "player:roll_dice", "p1"),
      event(2, "state:update", undefined, { reason: "roll_resolved" }),
      event(3, "player:roll_dice", "p2")
    ],
    game: { currentPlayerId: "p2" }
  } as GameSnapshot;
  assert.equal(latestGameTurn(snapshot)?.events[0]?.id, "event-3");
});

test("marks the current player with a pending choice as deciding", () => {
  const player = { id: "p1", status: "JOINED", track: "RAT_RACE" } as GamePlayer;
  const snapshot = {
    game: {
      currentPlayerId: "p1",
      pendingAction: { type: "choose_deal", gamePlayerId: "p1" }
    }
  } as GameSnapshot;
  assert.equal(playerGameStatus(snapshot, player), "Решает");
});
