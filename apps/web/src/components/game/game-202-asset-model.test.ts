import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import type { GameSnapshot } from "../../lib/types";
const require = createRequire(import.meta.url);
const { newGame202, finances202 } = require("@cashflow/shared") as typeof import("@cashflow/shared");
const { portfolioAssets202 } = require("./game-202-asset-model") as typeof import("./game-202-asset-model");

function fixture() {
  const state = newGame202(["one", "two"].map(id => ({ id, salary: 1000, passive: 0, expenses: 300, savings: 1000, childCost: 100, dream: 0, loans: [] })), () => 0);
  const player = state.players[0]!;
  player.stocks = []; player.options = []; player.shorts = []; player.d2y = []; player.rights = [];
  state.assets = [{ id: "shared", name: "Общий объект", kind: "property", source: "fixture", owners: {one: 5000, two: 5000}, cost: 20003, mortgage: 10002, down: 10001, income: 101, units: 1, acres: 0, house: false, lockedUntil: {one: 2} }];
  return { state, player, snapshot: { game202: state } as unknown as GameSnapshot };
}

test("202 portfolio preserves allocated cents, mortgage, ownership and lock without inventing a quote", () => {
  const { snapshot } = fixture();
  const own = portfolioAssets202(snapshot, "one")[0]!;
  const other = portfolioAssets202(snapshot, "two")[0]!;
  assert.equal(own.costBasisCents, 5001);
  assert.equal(own.cashflowCents, 51);
  assert.equal(own.cashflowCents + other.cashflowCents, 101);
  assert.equal(own.costBasisCents + other.costBasisCents, 10001);
  assert.equal(own.marketValueCents, null);
  assert.match(own.details!.find(row => row.label === "Ипотека доли")!.value, /50,01/);
  assert.equal(own.details!.find(row => row.label === "Ваша доля")!.value, "50%");
  assert.equal(own.details!.find(row => row.label === "Продажа временно запрещена")!.value, "До круга 2");
});

test("202 option, short, right and D2Y details retain their distinct accounting", () => {
  const { state, player, snapshot } = fixture();
  player.options = [{id: "call", symbol: "MYT4U", side: "call", quantity: 100, cost: 12345, strikeTotal: 500000, expires: 6}];
  player.shorts = [{id: "short", symbol: "MYT4U", quantity: 100, cost: 234567}];
  player.rights = [{id: "right", cost: 12345, order: 8}];
  player.d2y = [{level: 3, income: 12345}];
  let assets = portfolioAssets202(snapshot, player.id);
  const call = assets.find(asset => asset.id === "call")!;
  assert.equal(call.costBasisCents, 12345);
  assert.equal(call.quantity, 100);
  assert.equal(call.kindLabel, "Опцион");
  assert.match(call.details!.find(row => row.label === "Полная цена исполнения")!.value, /5\s000/);
  assert.equal(call.details!.find(row => row.label === "Действует до конца своего хода")!.value, "6");
  assert.equal(assets.find(asset => asset.id === "short")!.costBasisCents, 0, "short proceeds are not invested capital");
  assert.match(assets.find(asset => asset.id === "short")!.details![0]!.value, /2\s345,67/);
  assert.equal(assets.find(asset => asset.id === "right")!.costBasisCents, 12345);
  assert.equal(assets.find(asset => asset.type === "network")!.cashflowCents, 0);
  assert.equal(assets.reduce((sum, asset) => sum + asset.cashflowCents, 0), finances202(state, player).passive - player.basePassive);
  player.d2y.push({level: 1, income: 0}, {level: 2, income: 1234});
  assets = portfolioAssets202(snapshot, player.id);
  assert.equal(assets.reduce((sum, asset) => sum + asset.cashflowCents, 0), finances202(state, player).passive - player.basePassive);
  assert(assets.every(asset => asset.marketValueCents === null));
});
