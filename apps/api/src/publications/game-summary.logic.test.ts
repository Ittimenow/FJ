import assert from "node:assert/strict";
import test from "node:test";
import { composeGameSummary, type GameSummaryFacts } from "./game-summary.logic";

test("summary includes every player mention and calculated highlights", () => {
  const facts: GameSummaryFacts = {
    gameId: "game-1",
    title: "Пятничная игра",
    endedAt: "2026-08-07T18:00:00.000Z",
    durationMinutes: 102,
    rounds: 11,
    endReason: "financial_freedom",
    winnerGamePlayerId: "p1",
    players: [
      { id: "p1", name: "Анна", mention: "@anna", profession: "Учитель", figurine: null, finalCashCents: 100, finalCashflowCents: 200, finalPassiveIncomeCents: 300, cashflowDeltaCents: 100, passiveIncomeDeltaCents: 300, assetsCount: 2, track: "FAST_TRACK", status: "JOINED" },
      { id: "p2", name: "Макс", mention: "Макс", profession: "Водитель", figurine: null, finalCashCents: 50, finalCashflowCents: 80, finalPassiveIncomeCents: 20, cashflowDeltaCents: 30, passiveIncomeDeltaCents: 20, assetsCount: 1, track: "RAT_RACE", status: "JOINED" }
    ],
    highlights: [{ playerId: "p2", kind: "recovered", text: "Макс восстановился после банкротства." }]
  };
  const summary = composeGameSummary(facts);
  assert.match(summary.body, /@anna/);
  assert.match(summary.body, /Макс/);
  assert.match(summary.body, /11 раундов/);
  assert.match(summary.body, /1 ч 42 мин/);
  assert.match(summary.body, /восстановился после банкротства/);
});
