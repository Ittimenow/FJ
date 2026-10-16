import assert from "node:assert/strict";
import test from "node:test";
import {
  botCashReserve,
  botDealReserve,
  botStockSaleQuantity,
  chooseBotDoodadPayment,
  chooseBotDealType,
  decideBotAuctionBid,
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
  assert.equal(botDealReserve(stableState), 1_050);
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

test("balanced bot borrows only enough to preserve its deal reserve", () => {
  const decision = decideBotDeal(
    { ...stableState, cashCents: 4_000 },
    {
      title: "Доходная сделка с кредитом",
      isStock: false,
      unitCostCents: 4_000,
      cashflowCents: 700
    }
  );
  assert.equal(decision.buy, true);
  assert.equal(decision.loanAmountCents, 2_000);
});

test("balanced bot accepts an affordable rental from the last game", () => {
  const doctor = {
    cashCents: 7_320,
    totalIncomeCents: 13_200,
    totalExpensesCents: 9_650,
    monthlyCashflowCents: 3_550
  };
  assert.equal(chooseBotDealType(doctor), "SMALL_DEAL");
  assert.deepEqual(
    decideBotDeal(doctor, {
      title: "Дом на продажу",
      isStock: false,
      unitCostCents: 3_000,
      cashflowCents: 100
    }),
    {
      buy: true,
      quantity: 1,
      loanAmountCents: 0,
      reason: "сделка увеличивает денежный поток и сохраняет резерв"
    }
  );
});

test("balanced bot accepts a positive-cashflow deal with no down payment", () => {
  assert.equal(
    decideBotDeal({ ...stableState, cashCents: 0, monthlyCashflowCents: 0 }, {
      title: "Дом с нулевым первым взносом",
      isStock: false,
      unitCostCents: 0,
      cashflowCents: 100
    }).buy,
    true
  );
});

test("balanced bot can finance a deal when it still increases monthly cashflow", () => {
  const decision = decideBotDeal(
    {
      cashCents: 4_060,
      totalIncomeCents: 2_500,
      totalExpensesCents: 2_040,
      monthlyCashflowCents: 460
    },
    {
      title: "Дом на продажу",
      isStock: false,
      unitCostCents: 4_000,
      cashflowCents: 200
    }
  );
  assert.equal(decision.buy, true);
  assert.equal(decision.loanAmountCents, 1_000);
});

test("balanced bot rejects a loan above the game's available amount", () => {
  const decision = decideBotDeal(
    {
      cashCents: 13_180,
      totalIncomeCents: 4_600,
      totalExpensesCents: 3_750,
      monthlyCashflowCents: 850
    },
    {
      title: "Дом с большим первым взносом",
      isStock: false,
      unitCostCents: 20_000,
      cashflowCents: 500
    }
  );
  assert.equal(decision.buy, false);
  assert.equal(decision.loanAmountCents, 0);
});

test("balanced bot spends only a small amount on discounted stocks", () => {
  const cheap = decideBotDeal(stableState, {
    title: "Акции по $5",
    isStock: true,
    unitCostCents: 5,
    cashflowCents: 0
  });
  assert.equal(cheap.buy, true);
  assert.equal(cheap.quantity, 100);
  assert.equal(decideBotDeal(stableState, {
    title: "Акции по $40",
    isStock: true,
    unitCostCents: 40,
    cashflowCents: 0
  }).buy, false);
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

test("balanced bot bids for a profitable opportunity without spending its reserve", () => {
  assert.deepEqual(
    decideBotAuctionBid(stableState, {
      downPaymentCents: 4_000,
      cashflowCents: 300
    }),
    {
      amountCents: 1_800,
      reason: "цена возможности сохраняет резерв и соответствует доходу сделки"
    }
  );
});

test("balanced bot declines an auction when the down payment consumes free cash", () => {
  assert.equal(
    decideBotAuctionBid(stableState, {
      downPaymentCents: 6_000,
      cashflowCents: 300
    }).amountCents,
    null
  );
});
