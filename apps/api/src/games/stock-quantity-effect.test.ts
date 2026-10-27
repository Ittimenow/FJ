import assert from "node:assert/strict";
import test from "node:test";
import { AssetStatus, BoardTrack } from "@prisma/client";
import { GamesService } from "./games.service";

test("обратное дробление меняет все пакеты нужного тикера и не трогает другие акции", async () => {
  const assets = [
    { id: "ok-10", gamePlayerId: "max", name: "Акции OK4U: $10", symbol: "OK4U", quantity: 300, units: 300 },
    { id: "ok-5", gamePlayerId: "max", name: "Акции OK4U: $5", symbol: "OK4U", quantity: 1000, units: 1000 },
    { id: "ok-1", gamePlayerId: "max", name: "Акции OK4U: $1", symbol: "OK4U", quantity: 20000, units: 20000 },
    { id: "chip", gamePlayerId: "max", name: "Акции CHIP", symbol: "CHIP", quantity: 400, units: 400 }
  ];
  const updates: Array<{ id: string; data: Record<string, unknown> }> = [];
  const tx = {
    playerAsset: {
      findMany: async ({ where, select }: {
        where: { status: AssetStatus; symbol: string; gamePlayer: { gameId: string; track: BoardTrack } };
        select: Record<string, boolean>;
      }) => {
        assert.deepEqual(where, {
          status: AssetStatus.ACTIVE,
          symbol: "OK4U",
          gamePlayer: { gameId: "game", track: BoardTrack.RAT_RACE }
        });
        assert.equal(select.name, true);
        return assets.filter((asset) => asset.symbol === where.symbol);
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        updates.push({ id: where.id, data });
      }
    }
  };
  const service = new GamesService({} as never);
  const events: Array<{ type: string; gamePlayerId?: string; payload: Record<string, unknown> }> = [];

  const affected = await (service as unknown as {
    applyStockQuantityEffect: (
      tx: unknown,
      gameId: string,
      title: string,
      symbol: string,
      actionType: string,
      amount: bigint,
      emittedEvents: Array<{ type: string; gamePlayerId?: string; payload: Record<string, unknown> }>
    ) => Promise<Set<string>>;
  }).applyStockQuantityEffect(tx, "game", "Обратное дробление акций OK4U", "OK4U", "asset.quantity.divide", 2n, events);

  assert.deepEqual([...affected], ["max"]);
  assert.deepEqual(updates, [
    { id: "ok-10", data: { quantity: 150, units: 150 } },
    { id: "ok-5", data: { quantity: 500, units: 500 } },
    { id: "ok-1", data: { quantity: 10000, units: 10000 } }
  ]);
  assert.deepEqual(events.map((event) => ({
    type: event.type,
    player: event.gamePlayerId,
    symbol: event.payload.symbol,
    assetName: event.payload.assetName,
    before: event.payload.beforeQuantity,
    after: event.payload.afterQuantity
  })), [
    { type: "card:stock_quantity_changed", player: "max", symbol: "OK4U", assetName: "Акции OK4U: $10", before: 300, after: 150 },
    { type: "card:stock_quantity_changed", player: "max", symbol: "OK4U", assetName: "Акции OK4U: $5", before: 1000, after: 500 },
    { type: "card:stock_quantity_changed", player: "max", symbol: "OK4U", assetName: "Акции OK4U: $1", before: 20000, after: 10000 }
  ]);
});
