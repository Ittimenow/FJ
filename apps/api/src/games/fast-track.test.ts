import assert from "node:assert/strict";
import test from "node:test";
import { fastTrackCells, fastTrackDreams, fastTrackDiceCount, fastTrackExpense, fastTrackPrice, fastTrackRoute, isDreamCell, readFastTrackWorld, settleFastTrackPurchase } from "@cashflow/shared";
import { GamesService } from "./games.service";

function purchase(index: number, override: Partial<Parameters<typeof settleFastTrackPurchase>[0]> = {}) {
  return settleFastTrackPurchase({ cell: fastTrackCells[index]!, playerId: "anna", dreamCellIndex: 0, cash: 1_000_000, income: 100_000, initialIncome: 100_000, charity: false, world: readFastTrackWorld({}), ...override });
}

test("full catalogue has 48 distinct cells and three paydays", () => {
  assert.deepEqual(fastTrackCells.map((cell) => cell.index), Array.from({ length: 48 }, (_, i) => i));
  assert.equal(new Set(fastTrackCells.map((cell) => cell.code)).size, 48);
  assert.deepEqual(fastTrackCells.filter((cell) => cell.rule.kind === "cashflow").map((cell) => cell.index + 1), [12,28,44]);
  assert.ok(fastTrackDreams.length > 20);
  assert.equal(isDreamCell(1), false);
  assert.equal(isDreamCell(0), true);
  assert.equal(isDreamCell(-1), false);
});
test("entry, wrap and all crossed paydays", () => {
  assert.deepEqual(fastTrackRoute(-1, 2).map((cell) => cell.index), [0,1]);
  assert.deepEqual(fastTrackRoute(47, 2).map((cell) => cell.index), [0,1]);
  assert.deepEqual(fastTrackRoute(10, 18).filter((cell) => cell.rule.kind === "cashflow").map((cell) => cell.index), [11,27]);
  assert.equal(fastTrackRoute(0, 96).filter((cell) => cell.rule.kind === "cashflow").length, 6);
});
test("ordinary business can be resold for twice the previous price", () => {
  const result = purchase(1);
  assert.equal(result.cash, 700_000);
  assert.equal(result.income, 114_000);
  assert.equal(result.world.owners[1], "anna");
  const resale = purchase(1, { world: result.world, playerId: "boris" });
  assert.equal(resale.cost, 600_000);
  assert.equal(resale.previousOwnerId, "anna");
  assert.equal(resale.world.owners[1], "boris");
  assert.equal(resale.world.purchaseCounts?.[1], 2);
  assert.equal(fastTrackPrice(fastTrackCells[1]!, "anna", 0, resale.world), 1_200_000);
  assert.throws(() => purchase(1, { world: result.world }), /принадлежит вам/);
  assert.throws(() => purchase(1, { cash: 299_999 }), /наличных/);
});

test("legacy owned business without a purchase count starts at the second price", () => {
  const world = readFastTrackWorld({ owners: { 1: "anna" } });
  assert.equal(fastTrackPrice(fastTrackCells[1]!, "boris", 0, world), 600_000);
  assert.equal(purchase(1, { playerId: "boris", world }).world.purchaseCounts?.[1], 2);
});
test("same-name workshops are independent properties", () => {
  const first = purchase(21);
  const second = purchase(25, { world: first.world });
  assert.equal(second.world.owners[21], "anna");
  assert.equal(second.world.owners[25], "anna");
});
for (const [index, minimum] of [[13,3],[23,4],[45,4]] as const) {
  test(`conditional business ${index + 1}: failure loses investment; success claims business`, () => {
    const failure = purchase(index, { die: minimum - 1 });
    assert.equal(failure.cash, 1_000_000 - fastTrackCells[index]!.cost);
    assert.equal(failure.income, 100_000);
    assert.equal(failure.world.owners[index], undefined);
    const success = purchase(index, { die: minimum });
    assert.equal(success.income, 100_000 + fastTrackCells[index]!.income);
    assert.equal(success.world.owners[index], "anna");
    const resale = purchase(index, { world: success.world, playerId: "boris" });
    assert.equal(resale.previousOwnerId, "anna");
    assert.equal(resale.cost, fastTrackCells[index]!.cost * 2);
    assert.equal(resale.success, true);
  });
}
for (const [index, minimum] of [[29,6],[39,5]] as const) {
  test(`IPO ${index + 1} pays cash without changing income and only closes after success`, () => {
    const failure = purchase(index, { die: minimum - 1 });
    assert.equal(failure.world.owners[index], undefined);
    const result = purchase(index, { die: minimum });
    assert.equal(result.cash, 1_500_000 - fastTrackCells[index]!.cost);
    assert.equal(result.income, 100_000);
    assert.equal(result.won, null);
    assert.throws(() => purchase(index, { die: 6, world: result.world }), /занята/);
  });
}
test("dream influence excludes the buyer's own token and grows with opponents", () => {
  const world = readFastTrackWorld({ influence: { 0: ["anna", "boris", "vera"] } });
  assert.equal(fastTrackPrice(fastTrackCells[0]!, "anna", 0, world), 750_000);
  assert.equal(fastTrackPrice(fastTrackCells[0]!, "anna", 2, world), 250_000);
  assert.equal(purchase(0, { world }).cash, 250_000);
  const purchased = readFastTrackWorld({ ...world, dreamPurchases: { 0: ["boris"] } });
  assert.equal(fastTrackPrice(fastTrackCells[0]!, "anna", 0, purchased), 1_500_000);
});
test("target dream wins, a different dream does not; another player may still buy their target", () => {
  assert.equal(purchase(0).won, "dream");
  const otherDream = purchase(2);
  assert.equal(otherDream.won, null);
  const resale = purchase(2, { playerId: "boris", dreamCellIndex: 2, world: otherDream.world });
  assert.equal(resale.won, "dream");
  assert.equal(resale.cost, fastTrackCells[2]!.cost * 2);
  assert.equal(resale.previousOwnerId, "anna");
  assert.equal(resale.world.dreamPurchases[2]?.at(-1), "boris");
  assert.equal(fastTrackPrice(fastTrackCells[2]!, "anna", 2, resale.world), fastTrackCells[2]!.cost * 4);
});
test("income victory uses the increase from entry, including exact threshold", () => {
  assert.equal(purchase(45, { die: 4 }).won, "fast_track_income");
  assert.equal(purchase(1, { initialIncome: 100_000, income: 135_999 }).won, null);
  assert.equal(purchase(1, { initialIncome: 100_000, income: 136_000 }).won, "fast_track_income");
});
test("permanent charity enables 1–3 dice and cannot be charged twice", () => {
  assert.equal(fastTrackDiceCount(false), 2);
  assert.throws(() => fastTrackDiceCount(false, 1));
  for (const count of [1,2,3]) assert.equal(fastTrackDiceCount(true, count), count);
  for (const count of [0,4,1.5,NaN]) assert.throws(() => fastTrackDiceCount(true, count));
  const result = purchase(7);
  assert.equal(result.charity, true);
  assert.equal(result.cash, 900_000);
  assert.throws(() => purchase(7, { charity: true }));
});
test("expense rounding leaves the odd dollar and never borrows money", () => {
  assert.equal(fastTrackExpense(101, "half_cash"), 50);
  assert.equal(fastTrackExpense(1, "half_cash"), 0);
  assert.equal(fastTrackExpense(0, "lose_cash"), 0);
  assert.equal(fastTrackExpense(101, "lose_cash"), 101);
});

test("service pays the previous owner and transfers business income on buyout", async () => {
  const seller = { id: "seller", userId: "seller-user", controller: "HUMAN", financialState: { cashCents: 300_000n, fastTrackIncomeCents: 114_000n } };
  const buyer = { id: "buyer", userId: null, controller: "BOT", track: "FAST_TRACK", fastTrackPosition: 1, dreamCellIndex: 0, financialState: { cashCents: 1_000_000n, fastTrackIncomeCents: 100_000n, fastTrackStartIncomeCents: 100_000n, fastTrackCharity: false } };
  const game = { id: "game", status: "IN_PROGRESS", rulesVersion: 2, currentTurnIndex: 1, settings: { pendingAction: { type: "fast_track_choice", gamePlayerId: "buyer", cellIndex: 1, decisionId: "decision", priceCents: 600_000 } }, fastTrackWorld: { owners: { 1: "seller" } }, players: [seller, buyer] };
  const updates: Array<{ gamePlayerId: string; data: any }> = [];
  let newWorld: any;
  const tx = {
    game: { findUniqueOrThrow: async () => game, update: async ({ data }: any) => { if (data.fastTrackWorld) newWorld = data.fastTrackWorld; } },
    playerFinancialState: {
      findUniqueOrThrow: async () => seller.financialState,
      update: async ({ where, data }: any) => { updates.push({ gamePlayerId: where.gamePlayerId, data }); }
    }
  };
  const service = new GamesService({ $transaction: async (action: (value: typeof tx) => Promise<void>) => action(tx) } as any);
  (service as any).expireGameIfNeeded = async () => null;
  (service as any).lockGame = async () => {};
  (service as any).advanceTurn = async () => {};
  (service as any).appendEvents = async () => {};
  (service as any).actionResult = async (_gameId: string, events: unknown[]) => events;

  const events: any = await service.decideFastTrack("game", service.botActorId("buyer"), { buy: true, decisionId: "decision" });
  assert.deepEqual(updates.find((entry) => entry.gamePlayerId === "buyer")?.data, { cashCents: 400_000n, fastTrackIncomeCents: 114_000n, fastTrackCharity: false });
  assert.deepEqual(updates.find((entry) => entry.gamePlayerId === "seller")?.data, { cashCents: { increment: 600_000n }, fastTrackIncomeCents: { decrement: 14_000n } });
  assert.equal(newWorld.owners[1], "buyer");
  assert.equal(newWorld.purchaseCounts[1], 2);
  assert.ok(events.some((event: any) => event.type === "fast_track:sold" && event.gamePlayerId === "seller"));
});

test("landing on another player's business offers a buyout instead of ending the turn", async () => {
  const service = new GamesService({} as any);
  let pending: any;
  let advanced = false;
  (service as any).advanceTurn = async () => { advanced = true; };
  const tx = {
    gamePlayer: { update: async () => {} },
    playerFinancialState: { update: async () => {} },
    game: { update: async ({ data }: any) => { pending = data.settings.pendingAction; } }
  };
  const game = { id: "game", currentRound: 1, currentTurnIndex: 0, settings: {}, fastTrackWorld: { owners: { 5: "seller" } }, players: [{ id: "seller", dreamCellIndex: 0 }, { id: "buyer", dreamCellIndex: 2 }] };
  const player = { id: "buyer", fastTrackPosition: 3, dreamCellIndex: 2, financialState: { cashCents: 1_000_000n, fastTrackIncomeCents: 100_000n, fastTrackCharity: false } };
  const random = Math.random;
  Math.random = () => 0;
  try { await (service as any).rollFastTrack(tx, game, player, 0, 2, []); }
  finally { Math.random = random; }
  assert.equal(pending?.cellIndex, 5);
  assert.equal(pending?.priceCents, 240_000);
  assert.equal(advanced, false);
});
