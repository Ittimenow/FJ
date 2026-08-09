import assert from "node:assert/strict";
import test from "node:test";
import { dealDownPaymentAmount } from "@cashflow/shared";

test("явный нулевой первоначальный взнос не заменяется полной ценой", () => {
  assert.equal(
    dealDownPaymentAmount({ down_payment: "0", price: "50000" }, 50_000),
    0
  );
});

test("цена используется только при отсутствии первоначального взноса", () => {
  assert.equal(dealDownPaymentAmount({ price: "50000" }, 50_000), 50_000);
  assert.equal(dealDownPaymentAmount({ down_payment: "" }, 50_000), 50_000);
});
