import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import { fastTrackCells, figurines, type SandboxScenario } from "@cashflow/shared";
import { GamesService } from "./games.service";
import { PrismaService } from "../prisma/prisma.service";

const url = process.env.FJ_TEST_DATABASE_URL;
test("sandbox scenarios against isolated PostgreSQL", { skip: !url }, async t => {
  const parsed = new URL(url!);
  assert.equal(parsed.hostname, "127.0.0.1");assert.equal(parsed.port, "55439");
  const db = new PrismaClient({ datasources: { db: { url: url! } } });
  const games = new GamesService(db as PrismaService);
  const suffix = randomUUID();
  const previousEmail = process.env.SANDBOX_ADMIN_EMAIL;
  const owner = await db.user.create({ data: { email: `sandbox-${suffix}@example.test`, passwordHash: "unused", displayName: "Администратор", role: "ADMIN", status: "ACTIVE", figurine: figurines[0]!.id } });
  const outsider = await db.user.create({ data: { email: `outsider-${suffix}@example.test`, passwordHash: "unused", displayName: "Другой администратор", role: "ADMIN", status: "ACTIVE" } });
  process.env.SANDBOX_ADMIN_EMAIL = owner.email;
  const profession = await db.profession.create({ data: { slug: suffix, name: "Тестировщик", salaryCents: 5000, totalIncomeCents: 5000, totalExpensesCents: 3000, otherExpensesCents: 3000, monthlyCashflowCents: 2000, savingsCents: 10000 } });
  const classic = await db.cardSet.create({ data: { name: `Sandbox 101 ${suffix}`, gameType: "CLASSIC_101", cards: { create: [
    { cardType: "SMALL_DEAL", slug: "house", title: "Дом для проверки", bodyText: "Цена $52 000. Взнос $6000. Поток $200.", category: "real_estate", meta: { create: [{ metaKey: "cost", metaValue: "52000" }, { metaKey: "down_payment", metaValue: "6000" }, { metaKey: "cashflow_monthly", metaValue: "200" }] } },
    { cardType: "SMALL_DEAL", slug: "stock", title: "Акции OK4U", bodyText: "Цена $5 за акцию", category: "stock", meta: { create: [{ metaKey: "symbol", metaValue: "OK4U" }, { metaKey: "cost", metaValue: "5" }] } },
    { cardType: "BIG_DEAL", slug: "big", title: "Крупная сделка", bodyText: "Цена $100000", category: "real_estate", meta: { create: [{ metaKey: "cost", metaValue: "100000" }, { metaKey: "down_payment", metaValue: "20000" }] } },
    { cardType: "MARKET", slug: "market", title: "Событие рынка", bodyText: "Без финансового эффекта" },
    { cardType: "DOODAD", slug: "doodad", title: "Расход", bodyText: "Без финансового эффекта" }
  ] } } });
  const records = JSON.parse(readFileSync(resolve(process.cwd(), "../../dist/recognized_202_cards_ru.json"), "utf8"));
  const advanced = await db.cardSet.create({ data: { name: `Sandbox 202 ${suffix}`, gameType: "ADVANCED_202", cards: { create: records.map((card: any) => ({ cardType: card.cardType, slug: card.slug, title: card.title, bodyText: card.bodyText, category: card.category, meta: { create: card.meta }, effects: { create: card.effects }, conditions: { create: card.conditions } })) } } });
  const ids: string[] = [];
  try {
    await t.test("another administrator cannot create a sandbox", async () => {
      assert.deepEqual(await games.sandboxAvailability(outsider.id), { allowed: false });
      await assert.rejects(games.createSandbox(outsider.id, { gameType: "101", cardSetId: classic.id }), /назначенному/);
    });
    for (const mode of ["101", "202"] as const) await t.test(`${mode}: controlled draw, ordinary decision, second player, reset and privacy`, async () => {
      let snapshot: any = await games.createSandbox(owner.id, { gameType: mode, cardSetId: mode === "101" ? classic.id : advanced.id });
      ids.push(snapshot.game.id);
      assert.equal(snapshot.game.isTest, true);assert.equal(snapshot.players.length, 2);
      assert.equal(snapshot.players[0].track, "RAT_RACE");
      const gameId = snapshot.game.id;
      const catalog = await games.sandboxCatalog(gameId, owner.id);
      const house = catalog.find(c => c.slug === (mode === "101" ? "house" : "set_202_capital_04"))!;
      const stock = catalog.find(c => c.slug === (mode === "101" ? "stock" : "set_202_capital_03"))!;
      const scenario: SandboxScenario = structuredClone(snapshot.sandbox.scenario);
      const [first, second] = scenario.players;
      first!.cash = 10000;first!.dice = [1];first!.nextCards = [house.id];
      second!.cash = 20000;second!.dice = [1];second!.assets = [{ cardId: stock.id, quantity: 100 }];
      snapshot = (await games.applySandboxScenario(gameId, owner.id, scenario)).snapshot;
      const initialSequence = snapshot.events.at(-1).sequence;
      const run = snapshot.sandbox.run;
      const act = async (playerId: string, action: any, payload: Record<string, unknown>) => {
        snapshot = (await games.sandboxAction(gameId, owner.id, { run: snapshot.sandbox.run, playerId, action, payload })).snapshot;
      };
      await assert.rejects(games.getGame(gameId, outsider.id), /назначенному/);
      await assert.rejects(games.sandboxCatalog(gameId, outsider.id), /назначенному/);
      await assert.rejects(games.resetSandbox(gameId, outsider.id), /назначенному/);
      await assert.rejects(games.sandboxAction(gameId, outsider.id, { run, playerId: first!.playerId, action: "turn:skip", payload: {} }), /назначенному/);
      await db.user.update({ where: { id: owner.id }, data: { status: "BLOCKED" } });
      await assert.rejects(games.resetSandbox(gameId, owner.id), /назначенному/);
      await db.user.update({ where: { id: owner.id }, data: { status: "ACTIVE" } });
      await assert.rejects(games.sandboxAction(gameId, owner.id, { run, playerId: randomUUID(), action: "turn:skip", payload: {} }), /Участник/);
      if (mode === "101") {
        assert.equal(snapshot.players[1].assets[0].quantity, 100);
        await act(first!.playerId, "player:roll_dice", { expectedTurn: "1:0" });
        assert.equal(snapshot.players[0].position, 0);
        await act(first!.playerId, "card:draw", { cardType: "SMALL_DEAL" });
        assert.equal(snapshot.game.pendingAction.cardId, house.id);
        await act(first!.playerId, "deal:buy", { cardId: house.id, quantity: 1 });
        assert.equal(snapshot.players[0].financialState.cashCents, 4000);
        await act(second!.playerId, "player:roll_dice", {});
        assert.equal(snapshot.players[1].position, 0);
      } else {
        assert.equal(snapshot.game202.players[1].stocks[0].quantity, 100);
        const command = async (playerId: string, payload: Record<string, unknown>) => act(playerId, "202/command", { revision: snapshot.game202.revision, taskId: snapshot.game202.queue[0].id, ...payload });
        await command(first!.playerId, { type: "roll", quantity: 1 });
        await command(first!.playerId, { type: "choose", choice: "capital" });
        assert.equal(snapshot.game202.queue[0].slug, house.slug);
        await command(first!.playerId, { type: "decide", choice: "buy", quantity: 1 });
        assert.equal(snapshot.game202.players[0].cash, 400000);
        assert.equal("testControls" in snapshot.game202, false);
      }
      snapshot = (await games.resetSandbox(gameId, owner.id)).snapshot;
      assert.equal(snapshot.sandbox.run, run + 1);
      assert.ok(snapshot.events[0].sequence > initialSequence);
      const replay = await games.replay(gameId, owner.id);
      assert.ok(replay.events.every(event => event.sequence > initialSequence));
      assert.equal(snapshot.players[0].financialState.cashCents, 10000);
      await assert.rejects(games.sandboxAction(gameId, owner.id, { run, playerId: first!.playerId, action: "turn:skip", payload: {} }), /перезапущен/);
      const restored: any = await games.getGame(gameId, owner.id);
      assert.deepEqual(restored.sandbox.scenario, scenario);
      if (process.env.FJ_SANDBOX_ARTIFACT_DIR) {
        mkdirSync(process.env.FJ_SANDBOX_ARTIFACT_DIR, { recursive: true });
        writeFileSync(resolve(process.env.FJ_SANDBOX_ARTIFACT_DIR, `${mode}.json`), JSON.stringify({ snapshot: restored, catalog, ownerId: owner.id }));
      }
      const fast = structuredClone(scenario);fast.track = "FAST_TRACK";
      fast.players.forEach(p => { p.position = 0;p.dice = [1, 1]; });
      fast.players[1]!.fastAssets = [fastTrackCells.find(c => c.rule.kind === "business")!.index];
      snapshot = (await games.applySandboxScenario(gameId, owner.id, fast)).snapshot;
      assert.equal(snapshot.players[1].track, "FAST_TRACK");
      assert.equal(snapshot.game.fastTrackWorld.owners[fast.players[1]!.fastAssets[0]!], second!.playerId);
      assert.equal(await db.gameSummary.count({ where: { gameId } }), 0);
      if (process.env.FJ_SANDBOX_KEEP_FIXTURES === "1") snapshot = (await games.applySandboxScenario(gameId, owner.id, scenario)).snapshot;
    });
  } finally {
    if (process.env.FJ_SANDBOX_KEEP_FIXTURES !== "1") {
      await db.game.deleteMany({ where: { id: { in: ids } } });
      await db.card.deleteMany({ where: { cardSetId: { in: [classic.id, advanced.id] } } });
      await db.cardSet.deleteMany({ where: { id: { in: [classic.id, advanced.id] } } });
      await db.profession.delete({ where: { id: profession.id } });
      await db.user.deleteMany({ where: { id: { in: [owner.id, outsider.id] } } });
    }
    if (previousEmail === undefined) delete process.env.SANDBOX_ADMIN_EMAIL;else process.env.SANDBOX_ADMIN_EMAIL = previousEmail;
    await db.$disconnect();
  }
});
