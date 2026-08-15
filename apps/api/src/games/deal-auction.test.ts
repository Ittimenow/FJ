import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { BankruptcyStatus, CardType, GameRole, GameStatus } from "@prisma/client";
import { GamesService } from "./games.service";

const card = {
  id: 42,
  slug: "small_deal_house",
  cardType: CardType.SMALL_DEAL,
  title: "2У коттедж: $40,000, +$220/мес",
  bodyText: "Первоначальный взнос $5,000",
  category: "realestate",
  subcategory: null,
  meta: [
    { metaKey: "price", metaValue: "40000" },
    { metaKey: "down_payment", metaValue: "5000" },
    { metaKey: "cashflow_monthly", metaValue: "220" }
  ],
  effects: [],
  conditions: []
};

const seller = {
  id: "seller",
  userId: "seller-user",
  role: GameRole.PLAYER,
  status: "JOINED",
  seat: 0,
  financialState: { bankruptcyStatus: BankruptcyStatus.NONE }
};
const buyer = {
  id: "buyer",
  userId: "buyer-user",
  role: GameRole.PLAYER,
  status: "JOINED",
  seat: 1,
  financialState: { bankruptcyStatus: BankruptcyStatus.NONE }
};
const secondBuyer = {
  id: "second-buyer",
  userId: "second-user",
  role: GameRole.PLAYER,
  status: "JOINED",
  seat: 2,
  financialState: { bankruptcyStatus: BankruptcyStatus.NONE }
};

function fixture(pendingAction: Record<string, unknown>) {
  const game = {
    id: "game-1",
    status: GameStatus.IN_PROGRESS,
    currentTurnIndex: 0,
    players: [seller, buyer, secondBuyer],
    settings: { pendingAction: structuredClone(pendingAction) }
  };
  const states = new Map([
    [seller.id, { cashCents: 0n }],
    [buyer.id, { cashCents: 10_000n }],
    [secondBuyer.id, { cashCents: 20_000n }]
  ]);
  const assets: Array<Record<string, unknown>> = [];
  let advancedTurns = 0;

  const transactionClient = {
    game: {
      findUniqueOrThrow: async () => ({
        ...game,
        settings: structuredClone(game.settings),
        players: [...game.players]
      }),
      update: async ({ data }: { data: { settings: typeof game.settings } }) => {
        game.settings = structuredClone(data.settings);
        return game;
      },
      updateMany: async ({
        where,
        data
      }: {
        where: { settings: { equals: unknown } };
        data: { settings: typeof game.settings };
      }) => {
        if (JSON.stringify(where.settings.equals) !== JSON.stringify(game.settings)) {
          return { count: 0 };
        }
        game.settings = structuredClone(data.settings);
        return { count: 1 };
      }
    },
    card: {
      findUnique: async () => structuredClone(card)
    },
    playerFinancialState: {
      findUniqueOrThrow: async ({ where }: { where: { gamePlayerId: string } }) => {
        const state = states.get(where.gamePlayerId);
        if (!state) throw new Error("Состояние не найдено");
        return state;
      },
      update: async ({
        where,
        data
      }: {
        where: { gamePlayerId: string };
        data: { cashCents: { increment?: bigint; decrement?: bigint } };
      }) => {
        const state = states.get(where.gamePlayerId);
        if (!state) throw new Error("Состояние не найдено");
        state.cashCents += data.cashCents.increment ?? 0n;
        state.cashCents -= data.cashCents.decrement ?? 0n;
        return state;
      }
    },
    playerAsset: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        assets.push(data);
        return data;
      }
    }
  };
  const prisma = {
    $transaction: async (callback: (tx: typeof transactionClient) => Promise<void>) =>
      callback(transactionClient)
  };
  const service = new GamesService(prisma as never);
  Object.assign(service as object, {
    expireGameIfNeeded: async () => null,
    requirePlayer: async (_tx: unknown, _gameId: string, userId: string) => {
      const player = game.players.find((candidate) => candidate.userId === userId);
      if (!player) throw new Error("Игрок не найден");
      return player;
    },
    recalculatePlayer: async () => undefined,
    checkGameWon: async () => false,
    advanceTurn: async () => {
      advancedTurns += 1;
    },
    appendEvents: async () => undefined,
    actionResult: async (_gameId: string, events: unknown[]) => ({ events })
  });

  return {
    service,
    game,
    states,
    assets,
    advancedTurns: () => advancedTurns
  };
}

test("начинает аукцион недвижимости для остальных активных игроков", async () => {
  const setup = fixture({
    type: "deal_card_drawn",
    gamePlayerId: seller.id,
    cardId: card.id,
    cardType: CardType.SMALL_DEAL
  });

  await setup.service.startDealAuction("game-1", seller.userId, { cardId: card.id });

  assert.deepEqual(setup.game.settings.pendingAction, {
    type: "deal_auction",
    gamePlayerId: seller.id,
    cardId: card.id,
    cardType: CardType.SMALL_DEAL,
    bidderGamePlayerIds: [buyer.id, secondBuyer.id],
    responses: []
  });
});

test("если все отказались, возвращает продавцу обычное решение по карточке", async () => {
  const setup = fixture({
    type: "deal_auction",
    gamePlayerId: seller.id,
    cardId: card.id,
    cardType: CardType.SMALL_DEAL,
    bidderGamePlayerIds: [buyer.id, secondBuyer.id],
    responses: [{ gamePlayerId: buyer.id, amountCents: null }]
  });

  await setup.service.declineDealAuction("game-1", secondBuyer.userId);

  assert.deepEqual(setup.game.settings.pendingAction, {
    type: "deal_card_drawn",
    gamePlayerId: seller.id,
    cardId: card.id,
    cardType: CardType.SMALL_DEAL
  });
  assert.equal(setup.advancedTurns(), 0);
});

test("продавец может выбрать не самую высокую ставку", async () => {
  const setup = fixture({
    type: "deal_auction",
    gamePlayerId: seller.id,
    cardId: card.id,
    cardType: CardType.SMALL_DEAL,
    bidderGamePlayerIds: [buyer.id, secondBuyer.id],
    responses: [
      { gamePlayerId: buyer.id, amountCents: 1_000 },
      { gamePlayerId: secondBuyer.id, amountCents: 2_000 }
    ]
  });

  await setup.service.selectDealAuctionOffer("game-1", seller.userId, {
    buyerGamePlayerId: buyer.id
  });

  assert.equal(setup.states.get(buyer.id)?.cashCents, 4_000n);
  assert.equal(setup.states.get(seller.id)?.cashCents, 1_000n);
  assert.equal(setup.states.get(secondBuyer.id)?.cashCents, 20_000n);
  assert.equal(setup.assets.length, 1);
  assert.equal(setup.assets[0]?.gamePlayerId, buyer.id);
  assert.equal(setup.assets[0]?.downPaymentCents, 5_000n);
  assert.equal(setup.game.settings.pendingAction, undefined);
  assert.equal(setup.advancedTurns(), 1);
});

test("повторно проверяет деньги победителя перед завершением аукциона", async () => {
  const setup = fixture({
    type: "deal_auction",
    gamePlayerId: seller.id,
    cardId: card.id,
    cardType: CardType.SMALL_DEAL,
    bidderGamePlayerIds: [buyer.id],
    responses: [{ gamePlayerId: buyer.id, amountCents: 1_000 }]
  });
  const buyerState = setup.states.get(buyer.id);
  if (buyerState) buyerState.cashCents = 5_500n;

  await assert.rejects(
    setup.service.selectDealAuctionOffer("game-1", seller.userId, {
      buyerGamePlayerId: buyer.id
    }),
    BadRequestException
  );

  assert.equal(setup.states.get(buyer.id)?.cashCents, 5_500n);
  assert.equal(setup.states.get(seller.id)?.cashCents, 0n);
  assert.equal(setup.assets.length, 0);
  assert.equal(setup.advancedTurns(), 0);
});

test("из двух одновременных выборов победителя применяется только один", async () => {
  const setup = fixture({
    type: "deal_auction",
    gamePlayerId: seller.id,
    cardId: card.id,
    cardType: CardType.SMALL_DEAL,
    bidderGamePlayerIds: [buyer.id, secondBuyer.id],
    responses: [
      { gamePlayerId: buyer.id, amountCents: 1_000 },
      { gamePlayerId: secondBuyer.id, amountCents: 2_000 }
    ]
  });

  const results = await Promise.allSettled([
    setup.service.selectDealAuctionOffer("game-1", seller.userId, {
      buyerGamePlayerId: buyer.id
    }),
    setup.service.selectDealAuctionOffer("game-1", seller.userId, {
      buyerGamePlayerId: secondBuyer.id
    })
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(
    results.filter(
      (result) => result.status === "rejected" && result.reason instanceof ConflictException
    ).length,
    1
  );
  assert.equal(setup.assets.length, 1);
  assert.equal(setup.advancedTurns(), 1);
});
