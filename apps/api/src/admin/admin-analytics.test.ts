import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { GameMode, GameStatus } from "@prisma/client";
import { AdminAnalyticsService } from "./admin-analytics.service";

const gameId = "00000000-0000-4000-8000-000000000001";

test("каталог возвращает все страницы и передаёт фильтры в запрос", async () => {
  const captured: { findManyArgs?: Record<string, unknown> } = {};
  const prisma = {
    game: {
      findMany: async (args: Record<string, unknown>) => {
        captured.findManyArgs = args;
        return [];
      },
      count: async () => 41
    }
  };
  const service = new AdminAnalyticsService(prisma as never);

  const result = await service.gameCatalog({
    page: "2",
    pageSize: "20",
    status: GameStatus.ENDED,
    mode: GameMode.SOLO,
    search: "Путешествие",
    from: "2026-08-01",
    to: "2026-08-07"
  });

  assert.equal(result.total, 41);
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 20);
  assert.equal(result.totalPages, 3);
  assert.equal(captured.findManyArgs?.skip, 20);
  assert.equal(captured.findManyArgs?.take, 20);
  const where = captured.findManyArgs?.where as {
    status?: string;
    mode?: string;
    OR?: unknown[];
  };
  assert.equal(where.status, GameStatus.ENDED);
  assert.equal(where.mode, GameMode.SOLO);
  assert.ok(where.OR && where.OR.length > 0);
  const createdAt = (captured.findManyArgs?.where as {
    createdAt: { gte: Date; lte: Date };
  }).createdAt;
  assert.equal(createdAt.gte.toISOString(), "2026-08-01T00:00:00.000Z");
  assert.equal(createdAt.lte.toISOString(), "2026-08-07T23:59:59.999Z");
});

test("выборочный экспорт включает каждую игру только один раз", async () => {
  let selectedIds: string[] = [];
  const createdAt = new Date("2026-08-07T10:00:00.000Z");
  const prisma = {
    game: {
      findMany: async ({ where }: { where: { id?: { in?: string[] } } }) => {
        selectedIds = where.id?.in ?? [];
        return [{ id: gameId }];
      },
      findUnique: async () => ({
        id: gameId,
        code: "FJ2026",
        title: "Тестовая игра",
        status: GameStatus.ENDED,
        mode: GameMode.MULTIPLAYER,
        maxPlayers: null,
        currentRound: 5,
        startedAt: createdAt,
        endedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        createdBy: null,
        players: [],
        _count: { events: 0, chatMessages: 0 }
      })
    },
    gameEvent: {
      findMany: async () => []
    }
  };
  const service = new AdminAnalyticsService(prisma as never);

  const exportBody = await service.exportSelectedNdjson([gameId, gameId]);
  const lines = exportBody.trim().split("\n").map((line) => JSON.parse(line));

  assert.deepEqual(selectedIds, [gameId]);
  assert.equal(lines[0].kind, "export_meta");
  assert.deepEqual(lines[0].filters.selectedGameIds, [gameId]);
  assert.equal(lines[1].kind, "game");
  assert.equal(lines[1].id, gameId);
});

test("выборочный экспорт требует хотя бы одну игру", async () => {
  const service = new AdminAnalyticsService({} as never);

  await assert.rejects(() => service.exportSelectedNdjson([]), BadRequestException);
});
