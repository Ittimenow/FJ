import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { fastTrackCells, figurines } from "@cashflow/shared";
import { GamesService } from "./games.service";
import { GamesBotService } from "./games-bot.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { PublicationsService } from "../publications/publications.service";

const url = process.env.FJ_TEST_DATABASE_URL;
// Never connect to the application's configured database. This suite only accepts the disposable port.
test("full game against isolated PostgreSQL", { skip: !url }, async (t) => {
  const parsed = new URL(url!);
  assert.equal(parsed.hostname, "127.0.0.1");
  assert.equal(parsed.port, "55439");
  const db = new PrismaClient({ datasources: { db: { url: url! } } });
  const prisma = db as PrismaService;
  const service = new GamesService(prisma);
  const suffix = randomUUID();
  const users = await Promise.all((["ADMIN", "HOST", "USER"] as const).map((role, i) => db.user.create({ data: {
    email: `${role}-${suffix}@example.test`, passwordHash: "integration-test-unused", displayName: role,
    role, status: "ACTIVE", figurine: figurines[i]!.id
  } })));
  const [admin, host, user] = users;
  const cardSet = await db.cardSet.create({ data: { name: `Integration ${suffix}`, cards: { create: (["SMALL_DEAL", "BIG_DEAL", "MARKET", "DOODAD"] as const).map((cardType) => ({ cardType, slug: `${cardType}-${suffix}`, title: "Тестовая карта", bodyText: "Без эффекта" })) } } });
  const profession = await db.profession.create({ data: { slug: suffix, name: "Тестировщик", salaryCents: 2_000, totalIncomeCents: 2_000, totalExpensesCents: 1_000, otherExpensesCents: 1_000, monthlyCashflowCents: 1_000, savingsCents: 5_000 } });
  const gameIds: string[] = [];
  let snapshot: any;
  const solo = async (testing = true) => {
    const result: any = await service.createSoloGame(admin!.id, { botCount: 1, cardSetId: cardSet.id, ...(testing ? { testing: true, testCashCents: 500_000, testIncomeCents: 100_000 } : {}) });
    gameIds.push(result.game.id);
    return result;
  };
  const setDecision = async (gameId: string, playerId: string, index: number) => {
    const decisionId = randomUUID();
    const game = await db.game.findUniqueOrThrow({ where: { id: gameId } });
    await db.gamePlayer.update({ where: { id: playerId }, data: { fastTrackPosition: index } });
    await db.game.update({ where: { id: gameId }, data: { currentTurnIndex: 0, settings: { ...(game.settings as Prisma.JsonObject), pendingAction: { type: "fast_track_choice", gamePlayerId: playerId, cellIndex: index, decisionId, priceCents: fastTrackCells[index]!.cost } } } });
    return decisionId;
  };
  try {
    await t.test("only admin may request test mode or test balances", async () => {
      for (const account of [host!, user!]) {
        await assert.rejects(service.createSoloGame(account.id, { botCount: 1, cardSetId: cardSet.id, testing: true }), /администратору/);
        await assert.rejects(service.createSoloGame(account.id, { botCount: 1, cardSetId: cardSet.id, testCashCents: 9_000_000 }), /администратору/);
      }
      await assert.rejects(service.createGame(host!.id, { testing: true }), /администратору/);
      await assert.rejects(service.createSoloGame(admin!.id, { botCount: 1, testing: true, testCashCents: -1 }), /суммы/);
    });
    await t.test("dream choice is compulsory and only accepts dream cells", async () => {
      snapshot = await solo();
      assert.equal(snapshot.game.rulesVersion, 2);
      await assert.rejects(service.startGame(snapshot.game.id, admin!.id), /мечту/);
      await assert.rejects(service.chooseDream(snapshot.game.id, admin!.id, 1), /клетку мечты/);
      await assert.rejects(service.chooseDream(snapshot.game.id, user!.id, 0), /не играете/);
      snapshot = (await service.chooseDream(snapshot.game.id, admin!.id, 0) as any).snapshot;
      assert.equal(snapshot.players.find((p: any) => p.userId === admin!.id).dreamCellIndex, 0);
      assert.equal((await service.getGame(snapshot.game.id, admin!.id) as any).players[0].dreamCellIndex, 0);
      await db.user.update({ where: { id: admin!.id }, data: { role: "HOST" } });
      try { await assert.rejects(service.startGame(snapshot.game.id, admin!.id), /только администратору/); }
      finally { await db.user.update({ where: { id: admin!.id }, data: { role: "ADMIN" } }); }
    });
    await t.test("test start initializes all players and freezes dreams", async () => {
      snapshot = (await service.startGame(snapshot.game.id, admin!.id) as any).snapshot;
      for (const player of snapshot.players) {
        assert.equal(player.track, "FAST_TRACK");
        assert.equal(player.fastTrackPosition, -1);
        assert.equal(player.financialState.cashCents, 500_000);
        assert.equal(player.financialState.fastTrackIncomeCents, 100_000);
      }
      await assert.rejects(service.chooseDream(snapshot.game.id, admin!.id, 2), /до старта/);
      await assert.rejects(service.takeLoan(snapshot.game.id, admin!.id, { amountCents: 1000 }), /малого круга/);
      await assert.rejects(service.startGame(snapshot.game.id, admin!.id), /уже началась/);
    });
    await t.test("two dice cross payday, stale roll is rejected and reload preserves cash", async () => {
      const original = Math.random;
      Math.random = () => 0.999;
      try { snapshot = (await service.rollDice(snapshot.game.id, admin!.id, { diceCount: 2, expectedTurn: "1:0" }) as any).snapshot; }
      finally { Math.random = original; }
      assert.equal(snapshot.players[0].fastTrackPosition, 11);
      assert.equal(snapshot.players[0].financialState.cashCents, 600_000);
      assert.equal(snapshot.game.currentTurnIndex, 1);
      assert.ok(snapshot.events.some((event: any) => event.type === "fast_track:cashflow"));
      await assert.rejects(service.rollDice(snapshot.game.id, admin!.id, { expectedTurn: "1:0" }));
      const restored: any = await new GamesService(prisma).getGame(snapshot.game.id, admin!.id);
      assert.equal(restored.players[0].financialState.cashCents, 600_000);
    });
    await t.test("simultaneous purchase requests charge once and mark one owner", async () => {
      const player = snapshot.players[0];
      const decisionId = await setDecision(snapshot.game.id, player.id, 1);
      const results = await Promise.allSettled([1,2].map(() => service.decideFastTrack(snapshot.game.id, admin!.id, { buy: true, decisionId })));
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      snapshot = await service.getGame(snapshot.game.id, admin!.id);
      assert.equal(snapshot.players[0].financialState.cashCents, 300_000);
      assert.equal(snapshot.players[0].financialState.fastTrackIncomeCents, 114_000);
      assert.equal(snapshot.game.fastTrackWorld.owners[1], player.id);
      const decision = await setDecision(snapshot.game.id, player.id, 3);
      await db.playerFinancialState.update({ where: { gamePlayerId: player.id }, data: { cashCents: 0 } });
      await assert.rejects(service.decideFastTrack(snapshot.game.id, admin!.id, { buy: true, decisionId: decision }), /наличных/);
      await service.decideFastTrack(snapshot.game.id, admin!.id, { buy: false, decisionId: decision });
    });
    await t.test("bot resolves fast-track opportunities through the same service", async () => {
      const bot = snapshot.players[1];
      const botService = new GamesBotService(prisma, service, {} as any, {} as any, {} as any);
      const loaded: any = await (botService as any).loadGame(snapshot.game.id);
      const action = await (botService as any).pendingActionForBot(loaded.players.find((p: any) => p.id === bot.id), { type: "fast_track_choice", gamePlayerId: bot.id, cellIndex: 3, priceCents: 300_000, decisionId: "test" });
      assert.equal(action.type, "fast_track_decision");
      assert.equal(action.buy, true);
      const pendingId = await setDecision(snapshot.game.id, bot.id, 3);
      await db.game.update({ where: { id: snapshot.game.id }, data: { currentTurnIndex: 1 } });
      await (botService as any).execute(snapshot.game.id, { ...action, decisionId: pendingId });
      const state = await db.playerFinancialState.findUniqueOrThrow({ where: { gamePlayerId: bot.id } });
      assert.equal(state.fastTrackIncomeCents, 109_500n);
    });
    await t.test("buying target ends test game without statistics or publication", async () => {
      const player = snapshot.players[0];
      await db.playerFinancialState.update({ where: { gamePlayerId: player.id }, data: { cashCents: 1_000_000 } });
      const decisionId = await setDecision(snapshot.game.id, player.id, 0);
      snapshot = (await service.decideFastTrack(snapshot.game.id, admin!.id, { buy: true, decisionId }) as any).snapshot;
      assert.equal(snapshot.game.status, "ENDED");
      assert.ok(snapshot.players[0].financialState.wonAt);
      assert.equal(snapshot.events.find((event: any) => event.type === "game:ended").payload.reason, "dream");
      assert.equal(await db.gameSummary.count({ where: { gameId: snapshot.game.id } }), 0);
      const profile: any = await new UsersService(prisma, {} as any).profile(admin!.id);
      assert.equal(profile.stats.wins, 0);
      assert.equal(profile.stats.gamesPlayed, 0);
      const publications = new PublicationsService(prisma, { get: () => undefined } as any);
      await assert.rejects(publications.generateGame(snapshot.game.id), /не публикуются/);
    });
    await t.test("normal game continues after freedom, transfers once, and wins on income", async () => {
      snapshot = await solo(false);
      snapshot = (await service.chooseDream(snapshot.game.id, admin!.id, 0) as any).snapshot;
      snapshot = (await service.startGame(snapshot.game.id, admin!.id) as any).snapshot;
      const player = snapshot.players[0];
      assert.equal(player.track, "RAT_RACE");
      await db.playerFinancialState.update({ where: { gamePlayerId: player.id }, data: { passiveIncomeCents: 2001, totalExpensesCents: 2000, cashCents: 10_000 } });
      assert.equal(await (service as any).checkGameWon(db, player.id, []), false);
      const loan = await db.playerLiability.create({ data: { gamePlayerId: player.id, type: "bank_loan", name: "Кредит", balanceCents: 1000, paymentCents: 100 } });
      await assert.rejects(service.enterFastTrack(snapshot.game.id, admin!.id), /погашенные/);
      await db.playerLiability.delete({ where: { id: loan.id } });
      snapshot = (await service.enterFastTrack(snapshot.game.id, admin!.id) as any).snapshot;
      assert.equal(snapshot.game.status, "IN_PROGRESS");
      assert.equal(snapshot.players[0].financialState.fastTrackStartIncomeCents, 200_100);
      assert.equal(snapshot.players[0].financialState.cashCents, 210_100);
      assert.equal(snapshot.players[1].track, "RAT_RACE");
      await assert.rejects(service.enterFastTrack(snapshot.game.id, admin!.id));
      await db.playerFinancialState.update({ where: { gamePlayerId: player.id }, data: { cashCents: 1_000_000 } });
      const decisionId = await setDecision(snapshot.game.id, player.id, 45);
      const original = Math.random; Math.random = () => 0.999;
      try { snapshot = (await service.decideFastTrack(snapshot.game.id, admin!.id, { buy: true, decisionId }) as any).snapshot; }
      finally { Math.random = original; }
      assert.equal(snapshot.game.status, "ENDED");
      assert.equal(snapshot.events.find((event: any) => event.type === "game:ended").payload.reason, "fast_track_income");
      assert.equal(await db.gameSummary.count({ where: { gameId: snapshot.game.id } }), 1);
      const lastState = await db.gameEvent.findFirst({ where: { gameId: snapshot.game.id, type: "state:update" }, orderBy: { sequence: "desc" } });
      assert.equal((lastState!.stateSnapshot as any).players[0].dreamCellIndex, 0);
      assert.equal((lastState!.stateSnapshot as any).game.fastTrackWorld.owners[45], player.id);
    });
    await t.test("legacy rooms start without dreams and still end at financial freedom", async () => {
      snapshot = await solo(false);
      await db.game.update({ where: { id: snapshot.game.id }, data: { rulesVersion: 1 } });
      await db.gamePlayer.updateMany({ where: { gameId: snapshot.game.id }, data: { dreamCellIndex: null } });
      snapshot = (await service.startGame(snapshot.game.id, admin!.id) as any).snapshot;
      const player = snapshot.players[0];
      assert.equal(player.track, "RAT_RACE");
      assert.equal(player.dreamCellIndex, null);
      await db.playerFinancialState.update({ where: { gamePlayerId: player.id }, data: { passiveIncomeCents: 2001, totalExpensesCents: 2000 } });
      const events: any[] = [];
      assert.equal(await (service as any).checkGameWon(db, player.id, events), true);
      assert.equal(events.find((event) => event.type === "game:ended").payload.reason, "financial_freedom");
      assert.equal((await db.game.findUniqueOrThrow({ where: { id: snapshot.game.id } })).status, "ENDED");
    });
  } finally {
    await db.game.deleteMany({ where: { id: { in: gameIds } } });
    await db.user.deleteMany({ where: { id: { in: users.map((item) => item.id) } } });
    await db.card.deleteMany({ where: { cardSetId: cardSet.id } });
    await db.cardSet.delete({ where: { id: cardSet.id } });
    await db.profession.delete({ where: { id: profession.id } });
    await db.$disconnect();
  }
});
