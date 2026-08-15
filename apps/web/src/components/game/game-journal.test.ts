import assert from "node:assert/strict";
import test from "node:test";
import {
  gamePlayerForEvent,
  gameTurns,
  groupTurnEventsByPlayer,
  latestGameTurn,
  playerGameStatus,
  shouldShowTurnEventGroupIdentity,
  turnsForPlayer
} from "./game-journal";
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

test("groups every action of the same player into one block", () => {
  const players = [
    { id: "p1", userId: "u1" },
    { id: "p2", userId: "u2" }
  ] as GamePlayer[];
  const events = [
    event(5, "market:sale_declined", "p2"),
    event(4, "market:sale_offer", "p1"),
    event(3, "player:move", "p2")
  ];

  const groups = groupTurnEventsByPlayer(events, players);

  assert.deepEqual(groups.map((group) => group.player?.id), ["p2", "p1"]);
  assert.deepEqual(groups[0]?.events.map((item) => item.sequence), [5, 3]);
});

test("resolves an action player from the event actor or payload", () => {
  const players = [
    { id: "p1", userId: "u1" },
    { id: "p2", userId: "u2" }
  ] as GamePlayer[];
  const actorEvent = {
    ...event(1, "game:paused"),
    actor: { id: "u1", displayName: "Первый игрок" }
  };
  const giftEvent = event(2, "player:baby_gift", undefined, {
    senderGamePlayerId: "p2"
  });

  assert.equal(gamePlayerForEvent(actorEvent, players)?.id, "p1");
  assert.equal(gamePlayerForEvent(giftEvent, players)?.id, "p2");
});

test("shows identity only for another player's action block", () => {
  const players = [
    { id: "p1", userId: "u1" },
    { id: "p2", userId: "u2" }
  ] as GamePlayer[];
  const [currentPlayerGroup, otherPlayerGroup] = groupTurnEventsByPlayer(
    [event(1, "player:move", "p1"), event(2, "market:sale_declined", "p2")],
    players
  );

  assert.equal(
    shouldShowTurnEventGroupIdentity(currentPlayerGroup!, "p1"),
    false
  );
  assert.equal(
    shouldShowTurnEventGroupIdentity(otherPlayerGroup!, "p1"),
    true
  );
});
