import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { command202, newGame202, prepareSandbox202, public202, isSandboxGame } from "@cashflow/shared";
import { canUseSandbox } from "./sandbox-access";
import { SandboxScenarioDto } from "./dto/sandbox.dto";
import { sandboxPayload } from "./sandbox-actions";
import { BuyDealDto } from "./dto/buy-deal.dto";

test("sandbox requires the configured active administrator, with no permissive fallback", () => {
  const owner = { role: "ADMIN", status: "ACTIVE", email: "owner@example.test" };
  assert.equal(canUseSandbox(owner, " OWNER@example.test "), true);
  for (const user of [null, { ...owner, role: "USER" }, { ...owner, role: "HOST" }, { ...owner, status: "BLOCKED" }, { ...owner, email: "another@example.test" }]) assert.equal(canUseSandbox(user, owner.email), false);
  assert.equal(canUseSandbox(owner, ""), false);
  assert.equal(isSandboxGame({ isTest: false, settings: { sandbox: { version: 1 } } }), false);
  assert.equal(isSandboxGame({ isTest: true, settings: { sandbox: { version: 1 } } }), true);
});

test("sandbox actions keep ordinary DTO validation and reject extra parameters", () => {
  assert.throws(() => sandboxPayload(BuyDealDto, { cardId: 1, quantity: -1 }));
  assert.throws(() => sandboxPayload(BuyDealDto, { cardId: 1, quantity: 1, actorId: "another" }));
  assert.equal(sandboxPayload(BuyDealDto, { cardId: 1, quantity: 1 }).quantity, 1);
  const invalid = plainToInstance(SandboxScenarioDto, { track: "RAT_RACE", firstPlayerId: "not-an-id", players: [{ cash: -1, dice: [7] }] });
  assert.ok(validateSync(invalid).length);
});

function setup202() {
  const base = newGame202(["a", "b"].map(id => ({ id, dream: 0, salary: 5000, passive: 0, expenses: 3000, savings: 0, childCost: 200, loans: [] })), max => max - 1);
  return prepareSandbox202(base, { track: "RAT_RACE", firstPlayerId: "a", players: [
    { playerId: "a", cash: 10000, position: -1, fastIncome: 100000, assets: [], nextCards: ["set_202_capital_04"], dice: [1] },
    { playerId: "b", cash: 20000, position: -1, fastIncome: 100000, assets: [{ slug: "set_202_capital_03", quantity: 100 }], nextCards: ["set_202_capital_23"], dice: [2] }
  ] });
}
test("202 setup uses native cents, preserves the other player's assets, and conceals controls", () => {
  const state = setup202();
  assert.equal(state.players[0]!.cash, 1_000_000);
  assert.equal(state.players[1]!.stocks[0]!.quantity, 100);
  assert.equal(state.players[1]!.stocks[0]!.symbol, "OK4U");
  assert.equal(state.players[1]!.cash, 2_000_000);
  assert.equal("testControls" in public202(state), false);
  assert.equal("decks" in public202(state), false);
  const next = command202(state, "a", { revision: state.revision, type: "roll", taskId: state.queue[0]!.id, quantity: 1 }, () => 5);
  assert.equal(next.players[0]!.position, 0);
  assert.deepEqual(next.log.find(line => line.diceValues)?.diceValues, [1]);
  assert.equal(next.testControls!.dice.a, undefined);
  assert.deepEqual(state.testControls!.dice.a, [1]);
  assert.deepEqual(next.testControls!.cards.b, ["set_202_capital_23"]);
});
test("202 scheduled card goes to its participant and ordinary purchase changes cash and ownership", () => {
  let state = setup202();
  state.queue = [{ id: "choose", kind: "choose", playerId: "a" }];
  state.after = "end";
  state = command202(state, "a", { revision: state.revision, type: "choose", taskId: "choose", choice: "capital" }, () => 0);
  assert.equal(state.queue[0]!.slug, "set_202_capital_04");
  state = command202(state, "a", { revision: state.revision, type: "decide", taskId: state.queue[0]!.id, choice: "buy", quantity: 1 }, () => 0);
  assert.equal(state.players[0]!.cash, 400000);
  assert.equal(state.assets[0]!.owners.a, 10000);
  assert.equal(state.players[1]!.stocks[0]!.quantity, 100);
});
