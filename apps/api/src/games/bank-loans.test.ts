import assert from "node:assert/strict";
import test from "node:test";
import {
  availableBankLoanCents,
  bankLoanPaymentCents
} from "@cashflow/shared";

test("available bank loan preserves a non-negative monthly cashflow", () => {
  assert.equal(availableBankLoanCents(940), 9_000);
  assert.equal(availableBankLoanCents(100), 1_000);
  assert.equal(availableBankLoanCents(99), 0);
  assert.equal(availableBankLoanCents(0), 0);
  assert.equal(availableBankLoanCents(-500), 0);
});

test("an existing loan payment reduces the next available amount", () => {
  const cashflowAfterFirstLoan = 940 - bankLoanPaymentCents(5_000);

  assert.equal(cashflowAfterFirstLoan, 440);
  assert.equal(availableBankLoanCents(cashflowAfterFirstLoan), 4_000);
});

test("available bank loan uses the same calculation for database bigint values", () => {
  assert.equal(availableBankLoanCents(940n), 9_000n);
  assert.equal(availableBankLoanCents(99n), 0n);
});

test("bank loan payment is ten percent of the principal", () => {
  assert.equal(bankLoanPaymentCents(9_000), 900);
  assert.equal(bankLoanPaymentCents(9_000n), 900n);
});
