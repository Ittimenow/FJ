import assert from "node:assert/strict";
import test from "node:test";
import { GamesService } from "./games.service";

test("results use the saved finances and assets from the moment of entry", async () => {
  const service = new GamesService({
    gameEvent: {
      findMany: async () => [
        { sequence: 1, type: "player:roll_dice", gamePlayerId: "winner", payload: {} },
        { sequence: 2, type: "player:escaped_rat_race", gamePlayerId: "winner", payload: {} },
        { sequence: 3, type: "player:roll_dice", gamePlayerId: "winner", payload: {} },
        { sequence: 4, type: "game:ended", gamePlayerId: "winner", payload: { reason: "dream", winnerGamePlayerId: "winner" } }
      ],
      findFirst: async () => ({ stateSnapshot: { players: [{ id: "winner", financialState: { cashCents: 120000, passiveIncomeCents: 1200 }, assets: [{ id: "old-asset", name: "Дом" }] }] } })
    }
  } as never) as any;
  service.ensureGameAccess = async () => {};
  service.syncGameTimelineIfNeeded = async () => null;
  service.snapshot = async () => ({
    game: { id: "game", status: "ENDED" },
    players: [{ id: "winner", role: "PLAYER", controller: "HUMAN", financialState: { cashCents: 400000, wonAt: "2026-01-01" }, assets: [] }],
    awards: []
  });

  const results = await service.getGameResults("game", "user");
  assert.equal(results.winnerId, "winner");
  assert.equal(results.reason, "dream");
  assert.deepEqual(results.playerResults[0], {
    playerId: "winner", totalTurns: 2, smallCircleTurns: 1, bigCircleTurns: 1,
    childrenBorn: 0, dismissals: 0,
    entry: { financialState: { cashCents: 120000, passiveIncomeCents: 1200 }, assets: [{ id: "old-asset", name: "Дом" }] }
  });
});
