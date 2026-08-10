import assert from "node:assert/strict";
import test from "node:test";
import { ConflictException } from "@nestjs/common";
import { AssetStatus, GameRole, GameStatus } from "@prisma/client";
import { GamesService } from "./games.service";

const firstAssetId = "11111111-1111-4111-8111-111111111111";
const secondAssetId = "22222222-2222-4222-8222-222222222222";

type TestAsset = {
  id: string;
  gamePlayerId: string;
  name: string;
  cashflowCents: bigint;
  status: AssetStatus;
};

function marketOffer(
  assetId: string,
  assetName: string,
  proceedsCents: number,
  cashflowCents: number
) {
  return {
    gamePlayerId: "player-1",
    assetId,
    assetName,
    salePriceCents: 45_000,
    mortgageCents: 45_000 - proceedsCents,
    proceedsCents,
    cashflowCents,
    netCashflowChangeCents: cashflowCents * -1,
    cashflowAdjustmentCents: 0
  };
}

function serviceFixture() {
  const player = {
    id: "player-1",
    userId: "user-1",
    role: GameRole.PLAYER,
    status: "JOINED"
  };
  const firstOffer = marketOffer(firstAssetId, "Квартира 2/1, +$160/мес", -5_000, 160);
  const secondOffer = marketOffer(secondAssetId, "Квартира 2/1, -$100/мес", -10_000, -100);
  const game = {
    id: "game-1",
    status: GameStatus.IN_PROGRESS,
    currentRound: 1,
    currentTurnIndex: 0,
    players: [player],
    settings: {
      pendingAction: {
        type: "market_sale",
        cardId: 162,
        title: "Покупатель квартиры 2/1: $45,000",
        ...firstOffer,
        offerNumber: 1,
        totalOffers: 2,
        remainingOffers: [secondOffer]
      }
    }
  };
  const state = { cashCents: 30_000n };
  const assets = new Map<string, TestAsset>([
    [
      firstAssetId,
      {
        id: firstAssetId,
        gamePlayerId: player.id,
        name: firstOffer.assetName,
        cashflowCents: 160n,
        status: AssetStatus.ACTIVE
      }
    ],
    [
      secondAssetId,
      {
        id: secondAssetId,
        gamePlayerId: player.id,
        name: secondOffer.assetName,
        cashflowCents: -100n,
        status: AssetStatus.ACTIVE
      }
    ]
  ]);
  let advancedTurns = 0;

  const transactionClient = {
    game: {
      findUniqueOrThrow: async () => ({
        ...game,
        settings: structuredClone(game.settings),
        players: [...game.players]
      }),
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
    playerFinancialState: {
      findUniqueOrThrow: async () => state,
      update: async ({
        data
      }: {
        data: { cashCents: { increment?: bigint; decrement?: bigint } };
      }) => {
        state.cashCents += data.cashCents.increment ?? 0n;
        state.cashCents -= data.cashCents.decrement ?? 0n;
        return state;
      }
    },
    playerAsset: {
      findFirst: async ({
        where
      }: {
        where: { id: string; gamePlayerId: string; status: AssetStatus };
      }) => {
        const asset = assets.get(where.id);
        return asset?.gamePlayerId === where.gamePlayerId && asset.status === where.status
          ? asset
          : null;
      },
      update: async ({
        where,
        data
      }: {
        where: { id: string };
        data: { status: AssetStatus };
      }) => {
        const asset = assets.get(where.id);
        if (!asset) throw new Error("Актив не найден");
        asset.status = data.status;
        return asset;
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
    requirePlayer: async () => player,
    recalculatePlayer: async () => state,
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
    state,
    assets,
    advancedTurns: () => advancedTurns
  };
}

test("принимает отдельное решение по каждому подходящему дому", async () => {
  const fixture = serviceFixture();

  await fixture.service.sellMarketAsset("game-1", "user-1", { assetId: firstAssetId });

  assert.equal(fixture.assets.get(firstAssetId)?.status, AssetStatus.SOLD);
  assert.equal(fixture.assets.get(secondAssetId)?.status, AssetStatus.ACTIVE);
  assert.equal(fixture.state.cashCents, 25_000n);
  assert.equal(fixture.game.settings.pendingAction.assetId, secondAssetId);
  assert.equal(fixture.game.settings.pendingAction.offerNumber, 2);
  assert.equal(fixture.advancedTurns(), 0);

  await fixture.service.declineMarketSale("game-1", "user-1", { assetId: secondAssetId });

  assert.equal(fixture.assets.get(secondAssetId)?.status, AssetStatus.ACTIVE);
  assert.equal(fixture.game.settings.pendingAction, undefined);
  assert.equal(fixture.advancedTurns(), 1);
});

test("повторная команда по предыдущему дому не применяется к следующему", async () => {
  const fixture = serviceFixture();

  await fixture.service.sellMarketAsset("game-1", "user-1", { assetId: firstAssetId });

  await assert.rejects(
    fixture.service.sellMarketAsset("game-1", "user-1", { assetId: firstAssetId }),
    ConflictException
  );
  assert.equal(fixture.assets.get(secondAssetId)?.status, AssetStatus.ACTIVE);
  assert.equal(fixture.state.cashCents, 25_000n);
  assert.equal(fixture.game.settings.pendingAction.assetId, secondAssetId);
  assert.equal(fixture.advancedTurns(), 0);
});

test("из двух одновременных команд по дому применяется только одна", async () => {
  const fixture = serviceFixture();

  const results = await Promise.allSettled([
    fixture.service.sellMarketAsset("game-1", "user-1", { assetId: firstAssetId }),
    fixture.service.sellMarketAsset("game-1", "user-1", { assetId: firstAssetId })
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(fixture.assets.get(firstAssetId)?.status, AssetStatus.SOLD);
  assert.equal(fixture.assets.get(secondAssetId)?.status, AssetStatus.ACTIVE);
  assert.equal(fixture.state.cashCents, 25_000n);
  assert.equal(fixture.game.settings.pendingAction.assetId, secondAssetId);
});
