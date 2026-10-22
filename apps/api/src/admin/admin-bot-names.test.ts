import assert from "node:assert/strict";
import test from "node:test";
import { AdminService } from "./admin.service";
import { GamesService } from "../games/games.service";

test("удалённое имя не выбирается для нового бота и может быть восстановлено", async () => {
  let isActive = true;
  const botName = {
    findMany: async ({ where }: { where?: { isActive: boolean } }) =>
      where?.isActive ? (isActive ? [{ name: "Милфа Света" }] : []) : [{ id: "bot-name", name: "Милфа Света", isActive }],
    update: async ({ data }: { data: { isActive: boolean } }) => {
      isActive = data.isActive;
      return { id: "bot-name", name: "Милфа Света", isActive };
    }
  };
  const prisma = { botName };
  const admin = new AdminService(prisma as never);
  const games = new GamesService(prisma as never) as unknown as {
    drawBotNames: (db: unknown, count: number) => Promise<string[]>;
  };

  assert.deepEqual(await games.drawBotNames(prisma, 1), ["Милфа Света"]);
  assert.equal((await admin.setBotNameActive("bot-name", false)).isActive, false);
  await assert.rejects(() => games.drawBotNames(prisma, 1), /не хватает имён/);
  assert.equal((await admin.listBotNames())[0]?.isActive, false);
  assert.equal((await admin.setBotNameActive("bot-name", true)).isActive, true);
  assert.deepEqual(await games.drawBotNames(prisma, 1), ["Милфа Света"]);
});
