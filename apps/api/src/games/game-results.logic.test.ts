import assert from "node:assert/strict";
import test from "node:test";
import { playerResultCounts, type ResultEvent } from "./game-results.logic";

test("counts the whole game, including skipped turns, across the circle transition", () => {
  const events: ResultEvent[] = Array.from({ length: 90 }, (_, index) => ({
    sequence: index + 1,
    type: "player:roll_dice",
    gamePlayerId: "winner"
  }));
  events.push(
    { sequence: 91, type: "player:baby", gamePlayerId: "winner" },
    { sequence: 92, type: "player:downsized", gamePlayerId: "winner" },
    { sequence: 93, type: "turn:skipped", gamePlayerId: "winner" },
    { sequence: 94, type: "player:escaped_rat_race", gamePlayerId: "winner" },
    { sequence: 95, type: "player:roll_dice", gamePlayerId: "winner" },
    { sequence: 96, type: "player:roll_dice", gamePlayerId: "other" }
  );
  assert.deepEqual(playerResultCounts(events, "winner"), {
    totalTurns: 92,
    smallCircleTurns: 91,
    bigCircleTurns: 1,
    childrenBorn: 1,
    dismissals: 1
  });
  assert.deepEqual(playerResultCounts(events, "other"), {
    totalTurns: 1,
    smallCircleTurns: 1,
    bigCircleTurns: 0,
    childrenBorn: 0,
    dismissals: 0
  });
});
