import assert from "node:assert/strict";
import test from "node:test";
import { BankruptcyStatus, BoardTrack, GameStatus, PlayerController } from "@prisma/client";
import { GamesBotService } from "./games-bot.service";

function botGame(cash: number, track: BoardTrack, charity = false) {
  return {
    status: GameStatus.IN_PROGRESS, rulesVersion: 2, currentTurnIndex: 0,
    settings: {}, fastTrackWorld: {},
    players: [{ id: "bot", controller: PlayerController.BOT, botStrategy: "expert_v1",
      track, dreamCellIndex: 6, fastTrackPosition: 4, position: 3, liabilities: [], assets: [],
      financialState: { cashCents: BigInt(cash), totalIncomeCents: 2_100n,
        totalExpensesCents: 1_000n, monthlyCashflowCents: 1_100n,
        passiveIncomeCents: 1_100n, fastTrackCharity: charity, bankruptcyStatus: "NONE" } }]
  };
}

test("эксперт ждёт денег на мечту перед переходом и выбирает число кубиков после благотворительности", async () => {
  const service = new GamesBotService({} as never, {} as never, {} as never, {} as never, {} as never) as any;
  assert.equal((await service.nextAction(botGame(0, BoardTrack.RAT_RACE)))?.type, "roll");
  assert.equal((await service.nextAction(botGame(30_000, BoardTrack.RAT_RACE)))?.type, "enter_fast_track");
  assert.equal((await service.nextAction(botGame(150_000, BoardTrack.FAST_TRACK, true)))?.diceCount, 1);
});

test("эксперт не тратит на благотворительность деньги своей мечты", async () => {
  const service = new GamesBotService({} as never, {} as never, {} as never, {} as never, {} as never) as any;
  const pending = { type: "fast_track_choice", gamePlayerId: "bot", cellIndex: 7,
    decisionId: "decision", priceCents: 100_000 };
  const poor = botGame(200_000, BoardTrack.FAST_TRACK).players[0];
  const rich = botGame(300_000, BoardTrack.FAST_TRACK).players[0];
  assert.equal((await service.pendingActionForBot(poor, pending, [poor])).buy, false);
  assert.equal((await service.pendingActionForBot(rich, pending, [rich])).buy, true);
});

test("банкротящийся бот продаёт актив вместо решения по оставшейся сделке", async () => {
  const service = new GamesBotService({} as never, {} as never, {} as never, {} as never, {} as never) as any;
  const game = botGame(100, BoardTrack.RAT_RACE) as any;
  game.players[0]!.financialState.bankruptcyStatus = BankruptcyStatus.LIQUIDATING;
  game.players[0]!.assets = [{ id: "asset", quantity: 2, cashflowCents: 10n }];

  for (const pendingAction of [
    { type: "deal_card_drawn", gamePlayerId: "bot", cardId: 42, cardType: "SMALL_DEAL" },
    { type: "stock_sale_window", gamePlayerId: "bot", cardId: 42, cardType: "SMALL_DEAL",
      salePriceCents: 100, symbol: "ABC", sellerGamePlayerIds: ["bot"], resolvedGamePlayerIds: [] }
  ]) {
    game.settings = { pendingAction };
    assert.deepEqual(await service.nextAction(game), {
      type: "sell_bankruptcy_asset",
      playerId: "bot",
      assetId: "asset",
      quantity: 2,
      reason: "при банкротстве сначала продаётся актив с наименьшим денежным потоком"
    });
  }
});
