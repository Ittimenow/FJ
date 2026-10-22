import assert from "node:assert/strict";
import test from "node:test";
import { acceptGameSnapshot } from "./game-snapshot-order";
import type { GameSnapshot } from "./types";

function snapshot(gameId: string, sequence: number): GameSnapshot {
  return {
    game: { id: gameId },
    events: sequence ? [{ sequence }] : []
  } as GameSnapshot;
}

test("late game snapshots cannot replace a newer turn", () => {
  const current = snapshot("game", 12);
  assert.equal(acceptGameSnapshot(current, snapshot("game", 11)), current);
  assert.equal(acceptGameSnapshot(current, snapshot("other", 13)), current);
  const newer = snapshot("game", 13);
  assert.equal(acceptGameSnapshot(current, newer), newer);
  const sameSequence = snapshot("game", 12);
  assert.equal(acceptGameSnapshot(current, sameSequence), sameSequence);
});
