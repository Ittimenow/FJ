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
  assert.equal(summary.headline, "«Пятничная игра»: Анна достигает финансовой свободы");
  assert.match(summary.body, /@anna/);
  assert.match(summary.body, /Макс/);
  assert.match(summary.body, /11 раундов/);
  assert.match(summary.body, /1 час 42 минуты/);
  assert.match(summary.body, /Главные повороты:/);
  assert.match(summary.body, /восстановился после банкротства/);
  assert.match(summary.body, /За столом: @anna и Макс\./);
});

test("summary reads as a short story instead of a duplicate statistics block", () => {
  const facts: GameSummaryFacts = {
    gameId: "game-2",
    title: "Вечерняя партия",
    endedAt: "2026-08-10T18:00:00.000Z",
    durationMinutes: 15,
    rounds: 22,
    endReason: "financial_freedom",
    winnerGamePlayerId: "max",
    players: [
      { id: "denis", name: "Денис", mention: "Денис", profession: null, figurine: null, finalCashCents: 0, finalCashflowCents: 1200, finalPassiveIncomeCents: 0, cashflowDeltaCents: 1200, passiveIncomeDeltaCents: 0, assetsCount: 1, track: "RAT_RACE", status: "JOINED" },
      { id: "cat", name: "Котик", mention: "Котик", profession: null, figurine: null, finalCashCents: 0, finalCashflowCents: 30000, finalPassiveIncomeCents: 30000, cashflowDeltaCents: 30000, passiveIncomeDeltaCents: 30000, assetsCount: 1, track: "RAT_RACE", status: "JOINED" },
      { id: "max", name: "Макс", mention: "Макс", profession: null, figurine: null, finalCashCents: 0, finalCashflowCents: 8500, finalPassiveIncomeCents: 8500, cashflowDeltaCents: 8500, passiveIncomeDeltaCents: 8500, assetsCount: 1, track: "FAST_TRACK", status: "JOINED" }
    ],
    highlights: [
      { playerId: "denis", kind: "cashflow_growth", text: "Денис: денежный поток вырос на 12 $ в месяц." },
      { playerId: "cat", kind: "deal:buy", text: "Котик: актив «Дом» добавил 300 $ к ежемесячному потоку." }
    ]
  };

  const summary = composeGameSummary(facts);
  assert.match(summary.body, /За 15 минут участники прошли 22 раунда\./);
  assert.match(summary.body, /пассивный доход к финалу составил 85 \$ в месяц/);
  assert.match(summary.body, /Главные повороты:/);
  assert.match(summary.body, /За столом: Денис, Котик и Макс\./);
  assert.doesNotMatch(summary.body, /3 игрока · 22 раунда/);
  assert.ok(summary.body.length <= 1024);
});
