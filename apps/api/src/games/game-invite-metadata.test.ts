import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import { GamesService } from "./games.service";

test("публичные данные приглашения содержат только название и имя ведущего", async () => {
  let receivedWhere: unknown = null;
  const prisma = {
    game: {
      findFirst: async (query: { where: unknown }) => {
        receivedWhere = query.where;
        return {
          title: "Вечерняя партия",
          createdBy: { displayName: "Анна" }
        };
      }
    }
  };
  const service = new GamesService(prisma as never);

  const metadata = await service.getInviteMetadata(" abc 123 ");

  assert.deepEqual(metadata, { title: "Вечерняя партия", hostName: "Анна" });
  assert.deepEqual(receivedWhere, {
    code: "ABC123",
    mode: "MULTIPLAYER",
    status: { not: "CANCELLED" }
  });
});

test("несуществующее приглашение не раскрывает данные", async () => {
  const prisma = { game: { findFirst: async () => null } };
  const service = new GamesService(prisma as never);

  await assert.rejects(
    () => service.getInviteMetadata("UNKNOWN"),
    (error: unknown) => error instanceof NotFoundException
  );
});
