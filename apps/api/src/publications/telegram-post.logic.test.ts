import assert from "node:assert/strict";
import test from "node:test";
import type { GameSummaryFacts } from "./game-summary.logic";
import { composeSeriesPost } from "./telegram-post.logic";

function facts(id: string, title: string, mention: string): GameSummaryFacts {
  return {
    gameId: id,
    title,
    endedAt: "2026-08-09T18:00:00.000Z",
    durationMinutes: 90,
    rounds: 10,
    endReason: "financial_freedom",
    winnerGamePlayerId: `${id}-player`,
    players: [{
      id: `${id}-player`, name: mention, mention, profession: null, figurine: null,
      finalCashCents: 0, finalCashflowCents: 0, finalPassiveIncomeCents: 100,
      cashflowDeltaCents: 0, passiveIncomeDeltaCents: 100, assetsCount: 1,
      track: "FAST_TRACK", status: "JOINED"
    }],
    highlights: [{ playerId: `${id}-player`, kind: "win", text: `${mention} достиг финансовой свободы.` }]
  };
}

test("series post combines games, winners and every unique player mention", () => {
  const result = composeSeriesPost([
    { headline: "Первая", body: "Итоги первой", facts: facts("g1", "Первая игра", "@anna") },
    { headline: "Вторая", body: "Итоги второй", facts: facts("g2", "Вторая игра", "Макс") }
  ]);
  assert.match(result.title, /Серия из 2 игр/);
  assert.match(result.body, /2 партии/);
  assert.match(result.body, /20 раундов/);
  assert.match(result.body, /@anna/);
  assert.match(result.body, /Макс/);
  assert.ok(result.body.length <= 1024);
});
