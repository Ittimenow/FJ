import assert from "node:assert/strict";
import test from "node:test";
import { fastTrackCells, fastTrackDreams, fastTrackDiceCount, fastTrackExpense, fastTrackPrice, fastTrackRoute, isDreamCell, readFastTrackWorld, settleFastTrackPurchase } from "@cashflow/shared";

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
test("ordinary business spends cash once and adds income", () => {
  const result = purchase(1);
  assert.equal(result.cash, 700_000);
  assert.equal(result.income, 114_000);
  assert.equal(result.world.owners[1], "anna");
  assert.throws(() => purchase(1, { world: result.world, playerId: "boris" }), /занята/);
  assert.throws(() => purchase(1, { cash: 299_999 }), /наличных/);
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
});
test("target dream wins, a different dream does not; another player may still buy their target", () => {
  assert.equal(purchase(0).won, "dream");
  const otherDream = purchase(2);
  assert.equal(otherDream.won, null);
  assert.equal(purchase(2, { playerId: "boris", dreamCellIndex: 2, world: otherDream.world }).won, "dream");
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
