import assert from "node:assert/strict";
import test from "node:test";
import { money } from "../../lib/format";
import { childExpenseCalculation } from "./child-expense";

test("shows the number of children and per-child cost before the total", () => {
  assert.equal(childExpenseCalculation(3, 60), `3 × ${money(60)} =`);
});

test("does not show a calculation when the player has no children", () => {
  assert.equal(childExpenseCalculation(0, 60), null);
});
