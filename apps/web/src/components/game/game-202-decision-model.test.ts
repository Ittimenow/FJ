import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import type { Asset202, Offer202, Rule202, Task202 } from "@cashflow/shared";

const require = createRequire(import.meta.url);
const { newGame202, command202, finances202, assetPortion202 } = require("@cashflow/shared") as typeof import("@cashflow/shared");
const { decisionPurchase202, decisionSale202, decisionShort202, quantityRules202, exchangeAssets202, offerPayment202 } = require("./game-202-decision-model") as typeof import("./game-202-decision-model");

function fixture(rule?: Rule202) {
  const state = newGame202(["one", "two"].map(id => ({ id, salary: 1000, passive: 0, expenses: 300, savings: 1000, childCost: 100, dream: 0, loans: [] })), () => 0);
  state.assets = [];
  state.after = "end";
  const player = state.players[0]!;
  player.cash = 100000000;
  player.stocks = []; player.options = []; player.shorts = []; player.d2y = []; player.loans = [];
  const task: Task202 = { id: "decision", kind: "deal", playerId: player.id, slug: "set_202_capital_04", ...(rule ? { rule } : {}) };
  state.queue = [task];
  return { state, player, task };
}

const property = (overrides: Partial<Extract<Rule202, { kind: "property" }>> = {}): Extract<Rule202, { kind: "property" }> => ({ kind: "property", cost: 60000, down: 9000, mortgage: 51000, income: 300, units: 2, acres: 0, house: false, ...overrides });
const asset = (overrides: Partial<Asset202> = {}): Asset202 => ({ id: "asset", name: "Общий дом", source: "card", kind: "property", cost: 10000000, mortgage: 6000000, down: 4000000, income: 10000, units: 4, acres: 0, house: false, owners: { one: 5000, two: 5000 }, lockedUntil: {}, ...overrides });

test("property purchase uses the actual fee while keeping the recorded down payment and cents", () => {
  const { state, player, task } = fixture(property({ fee: 3000.01 }));
  player.cash = 300000;
  let result = decisionPurchase202(state, player, task)!;
  assert.equal(result.downPaymentCents, 300001);
  assert.equal(result.assetDownPaymentCents, 900000);
  assert.equal(result.priceCents, 6000000);
  assert.equal(result.canBuy, false);
  assert.match(result.reason!, /Недостаточно/);
  player.cash++;
  result = decisionPurchase202(state, player, task)!;
  assert.equal(result.canBuy, true);
  const after = command202(state, player.id, { type: "decide", revision: state.revision, taskId: task.id, choice: "buy", quantity: 1 }, () => 0);
  assert.equal(player.cash - after.players[0]!.cash, result.paymentCents);
});

test("repair debt changes cashflow but is not charged twice as upfront cash", () => {
  const { state, player, task } = fixture({ kind: "market_property", property: property({ cost: 90000, mortgage: 90000, down: 0, income: 200 }), repair: 12000 });
  player.cash = 0;
  const result = decisionPurchase202(state, player, task)!;
  assert.equal(result.paymentCents, 0);
  assert.equal(result.repairLoanCents, 1200000);
  assert.equal(result.repairPaymentCents, 120000);
  assert.equal(result.cashflowCents, 20000);
  assert.equal(result.netCashflowChangeCents, -100000);
  assert.equal(result.canBuy, true);
  const beforeFlow = finances202(state, player).cashflow;
  const after = command202(state, player.id, { type: "decide", revision: state.revision, taskId: task.id, choice: "buy", quantity: 1 }, () => 0);
  assert.equal(after.players[0]!.cash, 0);
  assert.equal(finances202(after, after.players[0]!).cashflow - beforeFlow, result.netCashflowChangeCents);
  player.bankrupt = true;
  assert.match(decisionPurchase202(state, player, task)!.reason!, /банкротства/);
});

test("option calculator enforces lots and affordability without silently rewriting an invalid input", () => {
  const { state, player, task } = fixture({ kind: "option", side: "call", symbol: "MYT4U", premium: 2.51, strike: 10 });
  player.cash = 75299;
  assert.deepEqual(quantityRules202(task), { min: 100, step: 100, max: 5000 });
  for (const value of ["", 0, 99, 101, 5001, 100.5, Number.NaN] as const) assert.equal(decisionPurchase202(state, player, task, value)!.canBuy, false);
  const result = decisionPurchase202(state, player, task, 200)!;
  assert.equal(result.isStock, true);
  assert.equal(result.unitPriceCents, 251);
  assert.equal(result.paymentCents, 50200);
  assert.equal(result.maxAffordableQuantity, 200);
  assert.equal(result.canBuy, true);
  assert.equal(decisionPurchase202(state, player, task, 300)!.canBuy, false);
});

test("D2Y preview activates stored levels and permits the repeatable second level only", () => {
  const { state, player, task } = fixture({ kind: "d2y", level: 1, income: 0 });
  player.d2y = [{ level: 2, income: 100001 }, { level: 3, income: 500002 }];
  assert.equal(decisionPurchase202(state, player, task)!.cashflowCents, 600003);
  assert.equal(decisionPurchase202(state, player, task)!.paymentCents, 20000);
  player.d2y.push({ level: 1, income: 0 });
  assert.match(decisionPurchase202(state, player, task)!.reason!, /уже есть/);
  task.rule = { kind: "d2y", level: 3, income: 7000 };
  assert.equal(decisionPurchase202(state, player, task)!.canBuy, false);
  task.rule = { kind: "d2y", level: 2, income: 500 };
  player.cash = -1;
  assert.equal(decisionPurchase202(state, player, task)!.canBuy, true);
  assert.equal(decisionPurchase202(state, player, task)!.netCashflowChangeCents, 50000);
});

test("repeatable investments use total income and price while a priority decision does not spend a down payment", () => {
  const { state, player, task } = fixture({ kind: "investment", cost: 25.55, income: 1.23, repeat: true, royalty: false });
  const result = decisionPurchase202(state, player, task, 3)!;
  assert.equal(result.priceCents, 2555);
  assert.equal(result.paymentCents, 7665);
  assert.equal(result.cashflowCents, 369);
  assert.equal(result.quantityRules.max, 100000);
  task.rule = { kind: "investment", cost: 10, income: 1, repeat: false, royalty: true };
  assert.equal(decisionPurchase202(state, player, task, 2)!.canBuy, false);
  task.kind = "right"; task.rule = property(); player.cash = 0;
  assert.equal(decisionPurchase202(state, player, task), null);
});

test("quote actions use canonical prices, available stock totals, and separate purchase and short permissions", () => {
  const { state, player, task } = fixture();
  Object.assign(task, { kind: "quote", symbol: "MYT4U", price: 125, buy: true, sell: true });
  player.cash = 0;
  player.stocks = [{ id: "a", symbol: "MYT4U", quantity: 20, cost: 2000 }, { id: "b", symbol: "MYT4U", quantity: 30, cost: 4000 }, { id: "other", symbol: "OK4U", quantity: 999, cost: 1 }];
  assert.equal(quantityRules202(task, "sell", player).max, 50);
  assert.equal(decisionPurchase202(state, player, task, 100)!.canBuy, false);
  const short = decisionShort202(state, player, task, 100);
  assert.equal(short.canOpen, true);
  assert.equal(short.paymentCents, 0);
  assert.equal(short.proceedsHeldCents, 12500);
  task.traded = ["buy"];
  player.cash = 100000;
  assert.equal(decisionPurchase202(state, player, task, 100)!.canBuy, false);
  assert.equal(decisionShort202(state, player, task, 100).canOpen, true);
  task.traded.push("short");
  assert.equal(decisionShort202(state, player, task, 100).canOpen, false);
  task.traded = [];
  for (const value of ["", 99, 101, 5001] as const) assert.equal(decisionShort202(state, player, task, value).canOpen, false);
  player.cash = -1;
  assert.equal(decisionShort202(state, player, task, 100).canOpen, false);
});

test("exchange choices require a matching owned house and retain each owner's exact flow", () => {
  const { state, player, task } = fixture({ kind: "exchange", units: 1, property: property({ income: 500.01 }) });
  state.assets = [asset({ id: "land", units: 1, house: false }), asset({ id: "house", units: 1, house: true, income: 10001 })];
  assert.deepEqual(exchangeAssets202(state, player, task).map(item => item.id), ["house"]);
  assert.equal(decisionPurchase202(state, player, task, 1, "land")!.canBuy, false);
  player.cash = -1;
  const result = decisionPurchase202(state, player, task, 1, "house")!;
  assert.equal(result.canBuy, true);
  assert.equal(result.paymentCents, 0);
  assert.equal(result.netCashflowChangeCents, 20000);
  state.assets[1]!.lockedUntil.two = state.players[1]!.laps + 1;
  assert.match(decisionPurchase202(state, player, task, 1, "house")!.reason!, /временно/);
});

test("shared sale previews use settlement rounding rather than subtracting rounded shares", () => {
  const { state, player, task } = fixture();
  state.assets = [asset({ cost: 10000, mortgage: 9999, down: 1, income: 101, units: 1, house: true })];
  Object.assign(task, { kind: "sale", assetId: "asset", rule: { kind: "sale", filter: "house", price: 100 }, approved: [] });
  const first = decisionSale202(state, player, task)!;
  const second = decisionSale202(state, state.players[1]!, task)!;
  assert.equal(first.salePriceCents, 5000);
  assert.equal(first.mortgageCents, 5000);
  assert.equal(first.proceedsCents, 1);
  assert.equal(first.roundingAdjustmentCents, 1);
  assert.equal(second.roundingAdjustmentCents, -1);
  assert.equal(first.proceedsCents + second.proceedsCents, 1);
  assert.deepEqual(first.pendingOwnerIds, ["one", "two"]);
  const agreed = command202(state, player.id, { revision: state.revision, taskId: task.id, type: "decide", choice: "yes" }, () => 0);
  assert.equal(agreed.players[0]!.cash, player.cash);
  const next = decisionSale202(agreed, agreed.players[1]!, agreed.queue[0]!)!;
  assert.deepEqual(next.pendingOwnerIds, ["two"]);
  const done = command202(agreed, "two", { revision: agreed.revision, taskId: agreed.queue[0]!.id, type: "decide", choice: "yes" }, () => 0);
  assert.equal(done.players[0]!.cash - player.cash, first.proceedsCents);
  assert.equal(done.players[1]!.cash - state.players[1]!.cash, second.proceedsCents);
});

test("an uncovered sale retains the engine's consent action and exposes the required payment separately", () => {
  const { state, player, task } = fixture();
  state.assets = [asset({ mortgage: 9000000, owners: { one: 10000 }, units: 1, house: true })];
  Object.assign(task, { kind: "sale", assetId: "asset", rule: { kind: "sale", filter: "house", price: 80000 }, approved: [] });
  player.cash = 0;
  const result = decisionSale202(state, player, task)!;
  assert.equal(result.proceedsCents, -1000000);
  assert.equal(result.canAfford, false);
  assert.equal(result.requiredPaymentCents, 1000000);
  assert.equal(result.canAccept, true);
  const after = command202(state, player.id, { revision: state.revision, taskId: task.id, type: "decide", choice: "yes" }, () => 0);
  assert.equal(after.players[0]!.cash, result.proceedsCents);
  assert.equal(after.queue[0]!.kind, "debt");
  assert.equal(after.queue[0]!.loanAllowed, false);
});

test("land sale, foreclosure and exchange expose the same cash and flow deltas as settlement", () => {
  const { state, player, task } = fixture();
  const owned = asset({ acres: 20, units: 0, cost: 4000000, mortgage: 2000000, down: 2000000, income: -20001 });
  state.assets = [owned];
  Object.assign(task, { kind: "sale", assetId: "asset", rule: { kind: "sale", filter: "land", acres: 5, price: 40000 }, approved: [] });
  const land = decisionSale202(state, player, task)!;
  assert.equal(land.remainingAcres, 15);
  assert.equal(land.salePriceCents, 2000000);
  assert.equal(land.proceedsCents, 1000000);
  assert.equal(land.netCashflowChangeCents, -assetPortion202(owned, player.id, owned.income));
  task.rule = { kind: "rent", amount: -50 };
  const foreclosure = decisionSale202(state, player, task)!;
  assert.equal(foreclosure.kind, "foreclosure");
  assert.equal(foreclosure.mortgageCents, 0);
  assert.equal(foreclosure.proceedsCents, 500000);
  task.kind = "exchange";
  task.rule = { kind: "exchange", units: 2, property: property({ cost: 90000.01, mortgage: 80000.01, income: 300.01 }) };
  const exchange = decisionSale202(state, player, task)!;
  assert.equal(exchange.proceedsCents, 0);
  assert.equal(exchange.replacementMortgageCents, 4000001);
  assert.equal(exchange.netCashflowChangeCents, exchange.replacementCashflowCents - assetPortion202(owned, player.id, owned.income));
});

test("stale decisions, previous consent and another actor never enable an operation", () => {
  const { state, player, task } = fixture(property());
  task.playerId = "two";
  assert.equal(decisionPurchase202(state, player, task)!.canBuy, false);
  task.playerId = player.id;
  state.queue = [{ ...task, id: "new" }];
  assert.equal(decisionPurchase202(state, player, task)!.canBuy, false);
  state.queue = [task]; state.assets = [asset()];
  Object.assign(task, { kind: "sale", assetId: "asset", rule: { kind: "sale", filter: "plex", price: 35000 }, approved: [player.id] });
  assert.equal(decisionSale202(state, player, task)!.canAccept, false);
});

test("joint contributions assign rounding remainder to the proposer and preserve the exact price", () => {
  const offer: Offer202 = { id: "offer", kind: "joint", from: "one", to: "two", price: 101, shares: { one: 5000, two: 5000 }, accepted: ["one"], turn: 1 };
  assert.equal(offerPayment202(offer, "one"), 50);
  assert.equal(offerPayment202(offer, "two"), 51);
  assert.equal(offerPayment202(offer, "observer"), null);
  assert.equal(offerPayment202(offer, "one")! + offerPayment202(offer, "two")!, 101);
  assert.equal(offerPayment202({ ...offer, kind: "asset", price: 12345 }, "two"), 12345);
  assert.equal(offerPayment202({ ...offer, kind: "asset" }, "one"), null);
});
