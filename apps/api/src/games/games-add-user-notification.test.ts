import assert from "node:assert/strict";
import test from "node:test";
import { AccountStatus, GameMode, GamePlayerStatus, GameRole, GameStatus, SystemRole } from "@prisma/client";
import { GamesService } from "./games.service";

function setup(existingStatus?: GamePlayerStatus) {
  const notifications: Array<{ userId: string; gameId: string; kind: string; dedupeKey: string }> = [];
  const game = {
    id: "game-id", mode: GameMode.MULTIPLAYER, status: GameStatus.WAITING,
    createdById: "host-id", maxPlayers: 6,
    players: existingStatus ? [{ id: "player-id", userId: "player-user-id", role: GameRole.PLAYER, status: existingStatus, seat: 1 }] : []
  };
  const tx = {
    game: { findUniqueOrThrow: async () => game },
    gamePlayer: {
      create: async () => ({ id: "player-id" }),
      update: async () => ({ id: "player-id" })
    },
    userNotification: { create: async ({ data }: { data: typeof notifications[number] }) => { notifications.push(data); } }
  };
  const prisma = {
    game: { findUnique: async () => game },
    user: {
      findUniqueOrThrow: async () => ({ role: SystemRole.HOST, status: AccountStatus.ACTIVE }),
      findFirst: async () => ({ id: "player-user-id", email: "player@example.com", displayName: "Игрок" })
    },
    $transaction: async (callback: (client: never) => Promise<unknown>) => callback(tx as never)
  };
  const service = new GamesService(prisma as never);
  const internals = service as unknown as Record<string, unknown>;
  internals.lockGame = async () => {};
  internals.appendEvents = async () => {};
  internals.actionResult = async () => ({ snapshot: game });
  return { service, notifications };
}

test("ведущий добавляет игрока и создаёт ему оповещение", async () => {
  const { service, notifications } = setup();
  await service.addUserToGame("game-id", "host-id", { userId: "player-user-id", role: GameRole.PLAYER });
  assert.equal(notifications.length, 1);
  assert.deepEqual({ ...notifications[0], dedupeKey: undefined }, {
    userId: "player-user-id", gameId: "game-id", kind: "GAME_PLAYER_ADDED", dedupeKey: undefined
  });
});

test("повторное добавление уже присутствующего игрока не создаёт оповещение", async () => {
  const { service, notifications } = setup(GamePlayerStatus.JOINED);
  await service.addUserToGame("game-id", "host-id", { userId: "player-user-id", role: GameRole.PLAYER });
  assert.equal(notifications.length, 0);
});

test("возвращение удалённого игрока создаёт новое оповещение", async () => {
  const { service, notifications } = setup(GamePlayerStatus.KICKED);
  await service.addUserToGame("game-id", "host-id", { userId: "player-user-id", role: GameRole.PLAYER });
  assert.equal(notifications.length, 1);
});
