import assert from "node:assert/strict";
import test from "node:test";
import { GameMode, GameStatus, PlayerController } from "@prisma/client";
import { GamesService } from "./games.service";

test("увольнение не расходует оставшиеся ходы благотворительности", async () => {
  const financialState = {
    bankruptcyStatus: "NONE",
    bankruptcyTurns: 0,
    downsizedTurns: 2,
    charityTurns: 2
  };
  const player = {
    id: "player-1",
    userId: "user-1",
    controller: PlayerController.HUMAN,
    controllerUserId: null,
    financialState
  };
  const game = {
    id: "game-1",
    status: GameStatus.IN_PROGRESS,
    mode: GameMode.MULTIPLAYER,
    settings: {},
    currentTurnIndex: 0,
    players: [player]
  };
  const updates: Array<Record<string, unknown>> = [];
  const emittedEvents: Array<{ type: string; payload: Record<string, unknown> }> = [];

  const transactionClient = {
    game: {
      findUniqueOrThrow: async () => game
    },
    playerFinancialState: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        if ("downsizedTurns" in data) financialState.downsizedTurns -= 1;
        return financialState;
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
    advanceTurn: async () => undefined,
    appendEvents: async (
      _tx: unknown,
      _gameId: string,
      _userId: string,
      events: typeof emittedEvents
    ) => emittedEvents.push(...events),
    actionResult: async (_gameId: string, events: typeof emittedEvents) => ({ events })
  });

  await service.rollDice(game.id, player.userId);
  await service.rollDice(game.id, player.userId);

  assert.equal(financialState.downsizedTurns, 0);
  assert.equal(financialState.charityTurns, 2);
  assert.deepEqual(updates, [
    { downsizedTurns: { decrement: 1 } },
    { downsizedTurns: { decrement: 1 } }
  ]);
  assert.deepEqual(
    emittedEvents.filter((event) => event.type === "turn:skipped").map((event) => event.payload),
    [{ reason: "downsized" }, { reason: "downsized" }]
  );
});
