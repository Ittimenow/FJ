import assert from "node:assert/strict";
import test from "node:test";
import { GameMode, GamePlayerStatus, GameRole, GameStatus } from "@prisma/client";
import { GamesService } from "./games.service";

function serviceForJoin(initialCount: number, lockedCount: number, maxPlayers: number | null) {
  let createCalls = 0;
  const player = (index: number) => ({ userId: `other-${index}`, role: GameRole.PLAYER, status: GamePlayerStatus.JOINED, seat: index + 1 });
  const game = (count: number) => ({ id: "game-id", code: "ROOM", mode: GameMode.MULTIPLAYER, status: GameStatus.WAITING, maxPlayers, players: Array.from({ length: count }, (_, index) => player(index)) });
  const tx = {
    $queryRaw: async () => [{ id: "game-id" }],
    game: { findUniqueOrThrow: async () => game(lockedCount) },
    gamePlayer: { create: async () => { createCalls += 1; return { id: "new-player" }; } }
  };
  const prisma = {
    game: { findFirst: async () => game(initialCount) },
    $transaction: async (callback: (client: never) => Promise<unknown>) => callback(tx as never)
  };
  return { service: new GamesService(prisma as never), created: () => createCalls };
}

test("вход отклоняется, если последнее место заняли после первоначального чтения", async () => {
  const { service, created } = serviceForJoin(11, 12, 12);
  await assert.rejects(service.joinGame("new-user", { codeOrId: "ROOM", role: GameRole.PLAYER }), /Все места в игре заняты/);
  assert.equal(created(), 0);
});

test("старые комнаты без лимита не принимают игроков сверх шести мест", async () => {
  const { service, created } = serviceForJoin(6, 6, null);
  await assert.rejects(service.joinGame("new-user", { codeOrId: "ROOM", role: GameRole.PLAYER }), /Все места в игре заняты/);
  assert.equal(created(), 0);
});
