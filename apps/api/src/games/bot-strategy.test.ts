import assert from "node:assert/strict";
import test from "node:test";
import {
  botCashReserve,
  botStockSaleQuantity,
  chooseBotDoodadPayment,
  chooseBotDealType,
  decideBotDeal,
  shouldAcceptBotCharity
} from "./bot-strategy";

const stableState = {
  cashCents: 12_000,
  totalIncomeCents: 5_000,
  totalExpensesCents: 3_000,
  monthlyCashflowCents: 2_000
};

test("balanced bot keeps two months of expenses as reserve", () => {
  assert.equal(botCashReserve(stableState), 6_000);
  assert.equal(chooseBotDealType(stableState), "BIG_DEAL");
});

test("balanced bot buys a cashflow deal that preserves its reserve", () => {
  assert.deepEqual(
    decideBotDeal(stableState, {
      title: "Доходный дом",
      isStock: false,
      unitCostCents: 4_000,
      cashflowCents: 300
    }),
    {
      buy: true,
      quantity: 1,
      loanAmountCents: 0,
      reason: "сделка увеличивает денежный поток и сохраняет резерв"
    }
  );
});

test("balanced bot rejects a deal whose loan payment exceeds its cashflow", () => {
  const decision = decideBotDeal(
    { ...stableState, cashCents: 6_000 },
    {
      title: "Слабая сделка",
      isStock: false,
      unitCostCents: 8_000,
      cashflowCents: 100
    }
  );
  assert.equal(decision.buy, false);
  assert.equal(decision.loanAmountCents, 0);
});

test("balanced bot includes the new loan payment in its reserve calculation", () => {
  const decision = decideBotDeal(
    { ...stableState, cashCents: 8_000 },
    {
      title: "Доходная сделка с кредитом",
      isStock: false,
      unitCostCents: 4_000,
      cashflowCents: 700
    }
  );
  assert.equal(decision.buy, true);
  assert.equal(decision.loanAmountCents, 3_000);
});

test("balanced bot uses credit for a doodad that would consume the reserve", () => {
  assert.equal(chooseBotDoodadPayment(stableState, 7_000).payment, "credit");
  assert.equal(shouldAcceptBotCharity(stableState, 1_000).accepted, true);
});

test("balanced bot sells all shares only at a meaningful profit", () => {
  assert.equal(
    botStockSaleQuantity({
      availableQuantity: 20,
      averageCostCents: 10,
      salePriceCents: 15
    }).quantity,
    20
  );
  assert.equal(
    botStockSaleQuantity({
      availableQuantity: 20,
      averageCostCents: 10,
      salePriceCents: 11
    }).quantity,
    0
  );
});
