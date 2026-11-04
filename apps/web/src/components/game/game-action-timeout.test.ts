import assert from "node:assert/strict";
import test from "node:test";
import { recoveredActionEvents } from "./game-action-timeout";
import type { GameEvent } from "@/lib/types";

const event = (sequence: number, type: string, playerId = "me"): GameEvent => ({
  id: String(sequence), sequence, type, payload: { dice: 4 }, createdAt: "2026-11-04T12:00:00Z",
  gamePlayer: { id: playerId, role: "PLAYER", seat: 1 }
});

test("recovers a completed roll and its movement after an acknowledgement timeout", () => {
  const result = recoveredActionEvents("player:roll_dice", [event(14, "player:move"), event(13, "player:roll_dice"), event(12, "player:roll_dice")], 12, "me");
  assert.deepEqual(result?.map((entry) => entry.type), ["player:move", "player:roll_dice"]);
});

test("does not claim that another player's action completed the timed-out request", () => {
  assert.equal(recoveredActionEvents("player:roll_dice", [event(13, "player:roll_dice", "other")], 12, "me"), null);
  assert.equal(recoveredActionEvents("deal:buy", [event(13, "deal:buy")], 12, "me"), null);
});

test("recovers a skipped turn only when the matching player's event is newer", () => {
  assert.deepEqual(recoveredActionEvents("turn:skip", [event(15, "turn:skipped")], 14, "me")?.map((entry) => entry.type), ["turn:skipped"]);
  assert.equal(recoveredActionEvents("turn:skip", [event(14, "turn:skipped")], 14, "me"), null);
});
