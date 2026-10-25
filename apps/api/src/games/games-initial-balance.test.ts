import assert from "node:assert/strict";
import test from "node:test";
import { GamesService } from "./games.service";

test("initial cash matches each player's profession cashflow", async () => {
  const balances: { gamePlayerId: string; cashCents: bigint; monthlyCashflowCents: bigint }[] = [];
  const tx = {
    playerFinancialState: {
      deleteMany: async () => undefined,
      create: async ({ data }: { data: typeof balances[number] }) => { balances.push(data); }
    },
    playerAsset: { deleteMany: async () => undefined },
    playerLiability: { deleteMany: async () => undefined }
  };
  const service = new GamesService({} as never);
  const profession = (monthlyCashflowCents: bigint) => ({
    salaryCents: 200_000n,
    passiveIncomeCents: 0n,
    totalIncomeCents: 200_000n,
    taxesCents: 0n,
    mortgagePaymentCents: 0n,
    schoolLoanPaymentCents: 0n,
    carLoanPaymentCents: 0n,
    creditCardPaymentCents: 0n,
    retailPaymentCents: 0n,
    otherExpensesCents: 0n,
    totalExpensesCents: 100_000n,
    monthlyCashflowCents,
    savingsCents: 40_000n,
    homeMortgageCents: 0n,
    schoolDebtCents: 0n,
    carDebtCents: 0n,
    creditCardsDebtCents: 0n,
    retailDebtCents: 0n,
    perChildCostCents: 0n
  });

  await (service as any).createInitialFinancialState(tx, "human", profession(60_000n));
  await (service as any).createInitialFinancialState(tx, "bot", profession(90_000n));

  assert.deepEqual(balances.map(({ gamePlayerId, cashCents, monthlyCashflowCents }) => ({ gamePlayerId, cashCents, monthlyCashflowCents })), [
    { gamePlayerId: "human", cashCents: 60_000n, monthlyCashflowCents: 60_000n },
    { gamePlayerId: "bot", cashCents: 90_000n, monthlyCashflowCents: 90_000n }
  ]);
});
