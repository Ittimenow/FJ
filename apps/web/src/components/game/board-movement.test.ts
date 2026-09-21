import assert from "node:assert/strict";
import { test } from "node:test";
import { boardMove } from "./board-movement";
import type { GameEvent } from "@/lib/types";

const event = (payload: Record<string, unknown>): GameEvent => ({ id: "move", sequence: 1, type: "player:move", createdAt: "", gamePlayer: { id: "bot", seat: 2, role: "PLAYER" }, payload });

test("movement follows the server route across the start of the large track", () => {
  assert.deepEqual(boardMove(event({ from: 46, to: 2, steps: 4, route: [47, 0, 1, 2] }), 48)?.positions, [47, 0, 1, 2]);
  assert.deepEqual(boardMove(event({ from: -1, to: 2, steps: 3 }), 48)?.positions, [0, 1, 2]);
});

test("old events without a route still move correctly on either track", () => {
  assert.deepEqual(boardMove(event({ from: 22, to: 1, steps: 3 }), 24)?.positions, [23, 0, 1]);
  assert.deepEqual(boardMove(event({ from: 47, to: 1, steps: 2 }), 48)?.positions, [0, 1]);
});

test("malformed or inconsistent movements cannot leave a token off the board", () => {
  for (const payload of [{ from: 4, to: 5, steps: -1 }, { from: 4, to: 48, steps: 44 }, { from: 4, to: 6, steps: 1 }, { from: 4, to: 5, steps: Infinity }]) {
    assert.equal(boardMove(event(payload), 48), null);
  }
});
