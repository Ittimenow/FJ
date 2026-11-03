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

test("ready player may roll on the small track", async () => {
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
      position: 0,
      dreamCellIndex: 0,
      liabilities: [],
      financialState: {
        bankruptcyStatus: BankruptcyStatus.NONE,
        charityTurns: 0,
        bankruptcyTurns: 0,
        downsizedTurns: 0,
        passiveIncomeCents: 2_001n,
        totalExpensesCents: 2_000n
      }
    }]
  };
  const service = Object.create(GamesService.prototype) as GamesService;
  (service as any).prisma = {
    $transaction: async (action: (tx: unknown) => Promise<unknown>) => action({
      game: { findUniqueOrThrow: async () => game },
      gamePlayer: { update: async () => { throw new Error("small-track roll proceeded"); } }
    })
  };
  (service as any).expireGameIfNeeded = async () => null;
  (service as any).lockGame = async () => undefined;

  await assert.rejects(
    service.rollDice(game.id, "user", { expectedTurn: "1:0" }),
    /small-track roll proceeded/
  );
});

test("объявление банкротства после броска отменяет ожидающий выбор сделки", async () => {
  const player = {
    id: "bot",
    controller: PlayerController.BOT,
    track: BoardTrack.RAT_RACE,
    position: 0,
    financialState: {
      bankruptcyStatus: BankruptcyStatus.NONE as BankruptcyStatus,
      charityTurns: 0,
      bankruptcyTurns: 0,
      downsizedTurns: 0,
      monthlyCashflowCents: -1_000n,
      cashCents: 0n
    }
  };
  const game = {
    id: "game",
    status: GameStatus.IN_PROGRESS,
    rulesVersion: 2,
    currentRound: 1,
    currentTurnIndex: 0,
    settings: {} as Record<string, unknown>,
    players: [player]
  };
  const service = Object.create(GamesService.prototype) as any;
  service.prisma = {
    $transaction: async (action: (tx: unknown) => Promise<unknown>) => action({
      game: {
        findUniqueOrThrow: async () => game,
        update: async ({ data }: { data: { settings: Record<string, unknown> } }) => {
          game.settings = data.settings;
        }
      },
      gamePlayer: {
        update: async () => undefined,
        findUniqueOrThrow: async () => ({ status: "JOINED" })
      },
      playerFinancialState: {
        findUniqueOrThrow: async () => player.financialState
      }
    })
  };
  service.expireGameIfNeeded = async () => null;
  service.lockGame = async () => undefined;
  service.ratRaceCellsForMove = () => [];
  service.resolveCell = async () => {
    game.settings = { pendingAction: { type: "choose_deal", gamePlayerId: player.id } };
    return true;
  };
  service.recalculatePlayer = async (_tx: unknown, _id: string, events: Array<{ type: string; gamePlayerId: string }>) => {
    player.financialState.bankruptcyStatus = BankruptcyStatus.LIQUIDATING;
    events.push({ type: "bankruptcy:declared", gamePlayerId: player.id });
  };
  service.appendEvents = async () => undefined;
  service.actionResult = async () => ({});

  await service.rollDice(game.id, "bot:bot");

  assert.equal(game.settings.pendingAction, undefined);
  assert.equal(game.currentTurnIndex, 0);
});

test("завершение банкротства удаляет сделку из уже зависшей партии", async () => {
  const service = Object.create(GamesService.prototype) as any;
  const state = {
    bankruptcyStatus: BankruptcyStatus.LIQUIDATING as BankruptcyStatus,
    monthlyCashflowCents: 100n
  };
  let settings: Record<string, unknown> = {
    pendingAction: { type: "deal_card_drawn", gamePlayerId: "bot", cardId: 42, cardType: "SMALL_DEAL" }
  };
  const tx = {
    playerFinancialState: {
      findUniqueOrThrow: async () => state,
      update: async ({ data }: { data: { bankruptcyStatus: BankruptcyStatus } }) => {
        state.bankruptcyStatus = data.bankruptcyStatus;
        return state;
      }
    },
    gamePlayer: { findUniqueOrThrow: async () => ({ gameId: "game" }) },
    game: {
      findUniqueOrThrow: async () => ({ settings }),
      update: async ({ data }: { data: { settings: Record<string, unknown> } }) => {
        settings = data.settings;
      }
    }
  };
  const events: Array<{ type: string }> = [];

  await service.resolveBankruptcy(tx, "bot", events);

  assert.equal(settings.pendingAction, undefined);
  assert.equal(state.bankruptcyStatus, BankruptcyStatus.RECOVERED);
  assert.equal(events[0]?.type, "bankruptcy:recovered");
});
