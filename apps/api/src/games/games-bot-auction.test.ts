import assert from "node:assert/strict";
import test from "node:test";
import { BankruptcyStatus, BoardTrack, GameStatus, PlayerController } from "@prisma/client";
import { GamesBotService } from "./games-bot.service";

const seller = {
  id: "bot-seller",
  controller: PlayerController.BOT,
  track: BoardTrack.RAT_RACE,
  financialState: {
    cashCents: 0n,
    totalIncomeCents: 1_000n,
    totalExpensesCents: 1_000n,
    passiveIncomeCents: 0n,
    monthlyCashflowCents: 0n,
    bankruptcyStatus: BankruptcyStatus.NONE
  }
};
const buyer = {
  id: "buyer",
  controller: PlayerController.HUMAN,
  track: BoardTrack.RAT_RACE,
  financialState: {
    bankruptcyStatus: BankruptcyStatus.NONE,
    cashCents: 10_000n,
    passiveIncomeCents: 0n,
    totalExpensesCents: 1_000n
  }
};
const card = {
  id: 42,
  title: "Квартира на продажу",
  bodyText: "",
  category: "realestate",
  subcategory: null,
  meta: [
    { metaKey: "price", metaValue: "40000" },
    { metaKey: "down_payment", metaValue: "5000" },
    { metaKey: "cashflow_monthly", metaValue: "100" }
  ],
  effects: [],
  conditions: []
};

function fixture() {
  const games = {
    botActorId: (playerId: string) => playerId,
    isDealAuctionEligible: () => true,
    startDealAuction: async (_gameId: string, _userId: string, dto: { cardId: number }) => dto
  };
  const service = new GamesBotService(
    { card: { findUnique: async () => card } } as never,
    games as never,
    {} as never,
    {} as never,
    {} as never
  );
  return service as unknown as {
    pendingActionForBot: (player: unknown, pending: unknown, players: unknown[]) => Promise<{
      type: string;
      cardId?: number;
    }>;
    nextAction: (game: unknown) => Promise<{ type: string; buyerGamePlayerId?: string }>;
    execute: (gameId: string, action: unknown) => Promise<unknown>;
  };
}

test("бот предлагает недвижимость другим игрокам, если сам отказывается от покупки", async () => {
  const service = fixture();
  const pending = {
    type: "deal_card_drawn",
    gamePlayerId: seller.id,
    cardId: card.id,
    cardType: "SMALL_DEAL"
  };
  const action = await service.pendingActionForBot(seller, pending, [seller, buyer]);
  assert.equal(action.type, "start_auction");
  assert.equal(action.cardId, card.id);
  assert.deepEqual(await service.execute("game-1", action), { cardId: card.id });
});

test("бот выбирает платежеспособную ставку, если более высокая уже недоступна", async () => {
  const service = fixture();
  const secondBuyer = {
    ...buyer,
    id: "second-buyer",
    financialState: { ...buyer.financialState, cashCents: 5_100n }
  };
  const pending = {
    type: "deal_auction",
    gamePlayerId: seller.id,
    cardId: card.id,
    cardType: "SMALL_DEAL",
    bidderGamePlayerIds: [buyer.id, secondBuyer.id],
    responses: [
      { gamePlayerId: buyer.id, amountCents: 600 },
      { gamePlayerId: secondBuyer.id, amountCents: 1_000 }
    ]
  };
  const game = {
    status: GameStatus.IN_PROGRESS,
    players: [seller, buyer, secondBuyer],
    settings: { pendingAction: pending }
  };
  assert.deepEqual(await service.nextAction(game), {
    type: "select_auction",
    playerId: seller.id,
    buyerGamePlayerId: buyer.id,
    reason: "выбрано самое высокое доступное предложение"
  });
  assert.equal(
    (await service.nextAction({ ...game, players: [seller, { ...buyer, financialState: { ...buyer.financialState, cashCents: 5_000n } }, secondBuyer] })).type,
    "cancel_auction"
  );
});

test("бот не принимает символическую ставку за доходную квартиру", async () => {
  const service = fixture();
  const game = {
    status: GameStatus.IN_PROGRESS,
    players: [seller, buyer],
    settings: {
      pendingAction: {
        type: "deal_auction",
        gamePlayerId: seller.id,
        cardId: card.id,
        cardType: "SMALL_DEAL",
        bidderGamePlayerIds: [buyer.id],
        responses: [{ gamePlayerId: buyer.id, amountCents: 1 }]
      }
    }
  };
  assert.equal((await service.nextAction(game)).type, "cancel_auction");
});

test("бот не запускает аукцион повторно и не пытается продавать без покупателей", async () => {
  const service = fixture();
  const pending = {
    type: "deal_card_drawn",
    gamePlayerId: seller.id,
    cardId: card.id,
    cardType: "SMALL_DEAL"
  };
  assert.equal(
    (await service.pendingActionForBot(seller, { ...pending, auctionAttempted: true }, [seller, buyer])).type,
    "decline_deal"
  );
  assert.equal((await service.pendingActionForBot(seller, pending, [seller])).type, "decline_deal");
  assert.equal(
    (await service.pendingActionForBot(seller, pending, [
      seller,
      { ...buyer, financialState: { ...buyer.financialState, cashCents: 5_000n } }
    ])).type,
    "decline_deal"
  );
});
