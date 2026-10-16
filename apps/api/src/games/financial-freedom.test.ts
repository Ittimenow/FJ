import assert from "node:assert/strict";
import test from "node:test";
import {
  canEscapeRatRace,
  outstandingBankLoanBalanceCents
} from "@cashflow/shared";
import { BankruptcyStatus, BoardTrack, GameStatus, PlayerController } from "@prisma/client";
import { GamesService } from "./games.service";

test("player escapes the rat race with excess passive income and no bank loan", () => {
  assert.equal(canEscapeRatRace(1_001, 1_000, false), true);
});

test("bank loan blocks escape even when passive income exceeds expenses", () => {
  assert.equal(canEscapeRatRace(2_000, 1_000, true), false);
});

test("passive income must remain strictly greater than expenses", () => {
  assert.equal(canEscapeRatRace(1_000, 1_000, false), false);
});

test("only outstanding bank loans count toward the exit requirement", () => {
  assert.equal(
    outstandingBankLoanBalanceCents([
      { type: "home_mortgage", balanceCents: 50_000 },
      { type: "bank_loan", balanceCents: 3_000 },
      { type: "bank_loan", balanceCents: 0 }
    ]),
    3_000
  );
});

test("full bank loan repayment unlocks escape without requiring profession debts", () => {
  const professionDebts = [
    { type: "home_mortgage", balanceCents: 50_000 },
    { type: "school_debt", balanceCents: 10_000 }
  ];
  const beforeRepayment = [
    ...professionDebts,
    { type: "bank_loan", balanceCents: 1_000 }
  ];

  assert.equal(
    canEscapeRatRace(
      2_000,
      1_000,
      outstandingBankLoanBalanceCents(beforeRepayment) > 0
    ),
    false
  );
  assert.equal(
    canEscapeRatRace(
      2_000,
      1_000,
      outstandingBankLoanBalanceCents(professionDebts) > 0
    ),
    true
  );
});

test("ready player must enter the large track before another roll", async () => {
  const game = {
    id: "game",
    status: GameStatus.IN_PROGRESS,
    rulesVersion: 2,
    currentRound: 1,
    currentTurnIndex: 0,
    settings: {},
    players: [{
      id: "player",
      userId: "user",
      controller: PlayerController.HUMAN,
      track: BoardTrack.RAT_RACE,
      dreamCellIndex: 0,
      liabilities: [],
      financialState: {
        bankruptcyStatus: BankruptcyStatus.NONE,
        passiveIncomeCents: 2_001n,
        totalExpensesCents: 2_000n
      }
    }]
  };
  const service = Object.create(GamesService.prototype) as GamesService;
  (service as any).prisma = {
    $transaction: async (action: (tx: unknown) => Promise<unknown>) => action({
      game: { findUniqueOrThrow: async () => game }
    })
  };
  (service as any).expireGameIfNeeded = async () => null;
  (service as any).lockGame = async () => undefined;

  await assert.rejects(
    service.rollDice(game.id, "user", { expectedTurn: "1:0" }),
    /Перейдите на большой круг/
  );
});
