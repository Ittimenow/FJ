import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import type { GamePlayer, GameSnapshot } from "../../lib/types";
import { advancedFinancialPresentation, classicFinancialPresentation, freedomProgress, money202 } from "./financial-presentation";
const require=createRequire(import.meta.url);
const { canEscape202, finances202, newGame202 }=require("@cashflow/shared") as typeof import("@cashflow/shared");
const { expenseItems202, financialPlayers202 }=require("./game-202-financial-model") as typeof import("./game-202-financial-model");

function fixture() {
  const state = newGame202(["one", "two"].map(id => ({ id, salary: 1000, passive: 0, expenses: 300, savings: 1000, childCost: 100, dream: 0, loans: [] })), () => 0);
  const player = state.players[0]!;
  const source = {
    id: player.id, userId: "user", role: "PLAYER", status: "JOINED", track: "RAT_RACE", figurine: "rocket", seat: 1,
    profession: { id: 1, name: "Профессия", slug: "profession", taxesCents: 100 },
    liabilities: [{ id: "stale", name: "Учебный кредит", type: "school_debt", balanceCents: 999999, paymentCents: 999999 }],
    financialState: { cashCents: -999999, monthlyCashflowCents: -999999 }, assets: []
  } as unknown as GamePlayer;
  const snapshot = { game: { startedAt: "2026-11-12T00:00:00Z", endedAt: null }, game202: state, players: [source] } as unknown as GameSnapshot;
  return { state, player, source, snapshot };
}

test("202 report uses canonical cents rather than rounded or stale legacy finances", () => {
  const { player, state, snapshot } = fixture();
  player.cash = 1234567;
  player.salary = 100001;
  player.baseExpenses = 30303;
  player.basePassive = 20202;
  player.loans = [{ id: "canonical", name: "Учебный кредит", balance: 678901, payment: 4567, bank: false }];
  const actual = financialPlayers202(snapshot)[0]!;
  const expected = finances202(state, player);
  assert.equal(actual.financialState!.cashCents, 1234567);
  assert.equal(actual.financialState!.salaryCents, 100001);
  assert.equal(actual.financialState!.monthlyCashflowCents, expected.cashflow);
  assert.deepEqual(actual.liabilities, [{ id: "canonical", name: "Учебный кредит", type: "school_debt", balanceCents: 678901, paymentCents: 4567 }]);
  assert.match(money202(actual.financialState!.cashCents), /12\s345,67/);
  assert.equal(actual.figurine, "rocket");
});

test("202 expense rows total authoritative expenses without counting loans twice", () => {
  const { player, source, state } = fixture();
  player.baseExpenses = 30303;
  player.children = 2;
  player.childCost = 12345;
  player.insurance = true;
  player.loans = [
    { id: "education", name: "Учебный кредит", balance: 500000, payment: 4567, bank: false },
    { id: "bank1", name: "Банк", balance: 100000, payment: 10000, bank: true },
    { id: "bank2", name: "Банк", balance: 200000, payment: 20000, bank: true }
  ];
  const items = expenseItems202(player, source);
  assert.equal(items.reduce((sum, item) => sum + item.amountCents, 0), finances202(state, player).expenses);
  assert.equal(items.find(item => item.id === "taxes")!.amountCents, 10000);
  assert.equal(items.find(item => item.id === "other_expenses")!.amountCents, 20303);
  assert.equal(items.find(item => item.id === "bank_loan")!.amountCents, 30000);
  assert.equal(items.find(item => item.id === "children")!.amountCents, 24690);
  assert.match(items.find(item => item.id === "children")!.calculation!, /123,45/);
  assert.equal(items.find(item => item.id === "insurance")!.amountCents, 20000);
});

test("202 base-expense changes and zero-payment education debt keep totals honest", () => {
  const { player, source, state } = fixture();
  player.baseExpenses = 5001;
  player.loans = [{ id: "education", name: "Образовательный кредит", balance: 5000000, payment: 0, child: true, bank: false }];
  const items = expenseItems202(player, source);
  assert.equal(items.find(item => item.id === "taxes")!.amountCents, 5001);
  assert.equal(items.find(item => item.id === "other_expenses")!.amountCents, 0);
  assert.equal(items.reduce((sum, item) => sum + item.amountCents, 0), finances202(state, player).expenses);
  player.track = "FAST_TRACK";
  assert.deepEqual(expenseItems202(player, source), []);
});

test("202 financial-freedom widget uses double expenses, bank repayment, and nonnegative cash", () => {
  const { player, state } = fixture();
  state.assets = [];
  player.d2y = [];
  player.basePassive = 60000;
  player.baseExpenses = 30000;
  player.cash = 0;
  player.loans = [];
  const progress = () => {
    const f = finances202(state, player);
    return freedomProgress(advancedFinancialPresentation, f.passive, f.expenses, player.loans.filter(loan => loan.bank).reduce((sum, loan) => sum + loan.balance, 0), player.cash);
  };
  assert.equal(progress().target, 60000);
  assert.equal(progress().reached, canEscape202(state, player));
  assert.equal(progress().reached, true);
  player.cash = -1;
  assert.equal(progress().reached, false);
  player.cash = 0;
  player.basePassive = 59999;
  assert.equal(progress().reached, false);
  player.basePassive = 1000000;
  player.loans = [{ id: "bank", name: "Банк", balance: 1, payment: 0, bank: true }];
  assert.equal(progress().reached, canEscape202(state, player));
  assert.equal(progress().reached, false);
});

test("101 retains strict income threshold and legacy dollar formatting", () => {
  assert.equal(freedomProgress(classicFinancialPresentation, 100, 100, 0).reached, false);
  assert.equal(freedomProgress(classicFinancialPresentation, 101, 100, 0, -1).reached, true);
  assert.equal(freedomProgress(classicFinancialPresentation, 101, 100, 1).reached, false);
  assert.equal(freedomProgress(classicFinancialPresentation, 100, 100, 0).target, 101);
  assert.match(classicFinancialPresentation.money(12345), /12\s345/);
  assert.equal(classicFinancialPresentation.fastIncomeTarget, 50000);
  assert.equal(advancedFinancialPresentation.fastIncomeTarget, 5000000);
});
