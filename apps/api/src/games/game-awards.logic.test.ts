import assert from "node:assert/strict";
import test from "node:test";
import {
  minimumAwardActions,
  selectGameAwards,
  type GameAwardEvent
} from "./game-awards.logic";

const players = [
  { id: "anna", name: "Анна", mention: "@anna" },
  { id: "max", name: "Макс", mention: "Макс" },
  { id: "ira", name: "Ира", mention: "Ира" }
];

function events(type: string, playerId: string, count: number, payload = {}) {
  return Array.from({ length: count }, (_, index): GameAwardEvent => ({
    sequence: index + 1,
    type,
    gamePlayerId: playerId,
    payload
  }));
}

test("award requires at least three qualifying actions", () => {
  assert.equal(minimumAwardActions, 3);
  assert.deepEqual(selectGameAwards(events("player:baby", "anna", 1), players), []);
  assert.deepEqual(selectGameAwards(events("player:baby", "anna", 2), players), []);
  const awards = selectGameAwards(events("player:baby", "anna", 3), players);
  assert.equal(awards[0]?.kind, "family_person");
  assert.equal(awards[0]?.actionCount, 3);
  assert.match(awards[0]?.text ?? "", /@anna: 3 ребёнка/);
});

test("award is not granted when eligible leaders are tied", () => {
  const awards = selectGameAwards([
    ...events("player:downsized", "anna", 3),
    ...events("player:downsized", "max", 3).map((event, index) => ({ ...event, sequence: index + 10 }))
  ], players);
  assert.equal(awards.some((award) => award.kind === "career_swings"), false);
});

test("amount award checks action count before comparing totals", () => {
  const awards = selectGameAwards([
    ...events("loan:repay", "anna", 2, { amountCents: 100_000 }),
    ...events("loan:repay", "max", 3, { amountCents: 10_000 }).map((event, index) => ({ ...event, sequence: index + 10 }))
  ], players);
  const debt = awards.find((award) => award.kind === "debt_master");
  assert.equal(debt?.playerId, "max");
  assert.equal(debt?.metricValue, 30_000);
});

test("baby gifts are attributed to the sender from the payload", () => {
  const gifts: GameAwardEvent[] = Array.from({ length: 3 }, (_, index) => ({
    sequence: index + 1,
    type: "player:baby_gift",
    gamePlayerId: null,
    payload: { senderGamePlayerId: "ira", amountCents: 5_000 }
  }));
  const award = selectGameAwards(gifts, players).find((item) => item.kind === "good_neighbor");
  assert.equal(award?.playerId, "ira");
  assert.equal(award?.metricValue, 15_000);
});

test("financial phoenix requires recovery and three recovery actions", () => {
  const recovery: GameAwardEvent[] = [
    { sequence: 1, type: "bankruptcy:declared", gamePlayerId: "max", payload: { monthlyCashflowCents: -50_000 } },
    { sequence: 2, type: "bankruptcy:asset_sold", gamePlayerId: "max", payload: {} },
    { sequence: 3, type: "bankruptcy:debt_repaid", gamePlayerId: "max", payload: { amountCents: 10_000 } },
    { sequence: 4, type: "bankruptcy:debts_halved", gamePlayerId: "max", payload: {} },
    { sequence: 5, type: "bankruptcy:recovered", gamePlayerId: "max", payload: { monthlyCashflowCents: 20_000 } }
  ];
  const award = selectGameAwards(recovery, players).find((item) => item.kind === "financial_phoenix");
  assert.equal(award?.playerId, "max");
  assert.equal(award?.actionCount, 3);
  assert.equal(award?.metricValue, 70_000);
});

test("cashflow architect sums only positive cashflow actions", () => {
  const award = selectGameAwards([
    ...events("deal:buy", "anna", 2, { cashflowCents: 25_000 }),
    { sequence: 10, type: "market:cashflow_applied", gamePlayerId: "anna", payload: { totalAmountCents: 15_000 } },
    { sequence: 11, type: "card:cashflow_delta", gamePlayerId: "anna", payload: { amountCents: -90_000 } }
  ], players).find((item) => item.kind === "cashflow_architect");
  assert.equal(award?.actionCount, 3);
  assert.equal(award?.metricValue, 65_000);
});

test("money awards use the same whole dollars as the game", () => {
  const award = selectGameAwards(events("deal:buy", "anna", 4, { cashflowCents: 650 }), players)
    .find((item) => item.kind === "cashflow_architect")!;
  assert.equal(award.metricValue, 2600);
  assert.equal(award.result.replace(/\s/g, " "), "2 600 $ в месяц за 4 действия");
  const debt = selectGameAwards(events("loan:repay", "anna", 3, { amountCents: 1000 }), players)
    .find((item) => item.kind === "debt_master")!;
  assert.equal(debt.result.replace(/\s/g, " "), "3 000 $ погашено за 3 операции");
});

test("cashflow award counts actual increases on both tracks, including archived parties", () => {
  const actions: GameAwardEvent[] = [
    { sequence: 1, type: "deal:buy", gamePlayerId: "anna", payload: { cashflowCents: 650 } },
    { sequence: 2, type: "player:escaped_rat_race", gamePlayerId: "anna", payload: { incomeCents: 100_000 } },
    { sequence: 3, type: "fast_track:purchased", gamePlayerId: "anna", payload: { incomeCents: 106_000 } },
    { sequence: 4, type: "fast_track:purchased", gamePlayerId: "anna", payload: { incomeCents: 106_000, success: false } },
    { sequence: 5, type: "fast_track:cashflow", gamePlayerId: "anna", payload: { amountCents: 106_000 } },
    { sequence: 6, type: "fast_track:purchased", gamePlayerId: "anna", payload: { incomeCents: 114_000, incomeChangeCents: 8_000 } }
  ];
  const award = selectGameAwards(actions.reverse(), players).find((item) => item.kind === "cashflow_architect")!;
  assert.equal(award.actionCount, 3);
  assert.equal(award.metricValue, 14_650);
});

test("every first-release nomination uses its declared qualifying events", () => {
  const scenarios = [
    { kind: "career_swings", type: "player:downsized", payload: {} },
    { kind: "deal_hunter", type: "deal:buy", payload: {} },
    { kind: "bank_favorite", type: "loan:take", payload: {} },
    { kind: "generous_heart", type: "player:charity", payload: { donationCents: 10_000 } },
    { kind: "iron_patience", type: "deal:decline", payload: {} },
    { kind: "surprise_spending_king", type: "doodad:payment_resolved", payload: { method: "cash", cashPriceCents: 20_000 } }
  ];

  for (const scenario of scenarios) {
    const award = selectGameAwards(
      events(scenario.type, "anna", 3, scenario.payload),
      players
    ).find((item) => item.kind === scenario.kind);
    assert.equal(award?.playerId, "anna", scenario.kind);
    assert.equal(award?.actionCount, 3, scenario.kind);
  }
});
