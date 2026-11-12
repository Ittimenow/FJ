import assert from "node:assert/strict";
import test from "node:test";
import { GameMode, GameStatus, GameType, SystemRole } from "@prisma/client";
import { rules202 } from "@cashflow/shared";
import { validate } from "class-validator";
import { requiredCardTypes } from "./card-set";
import { GamesService } from "./games.service";
import { PlayableCardSetsQueryDto, UpdateLobbyDto } from "./dto/update-lobby.dto";
import { CreateGameDto } from "./dto/create-game.dto";
import { CreateSoloGameDto } from "./dto/create-solo-game.dto";

const sets = [
  { id: "classic", name: "Базовый набор", gameType: GameType.CLASSIC_101, isDefault: true },
  { id: "advanced", name: "Стратегии — переименованный", gameType: GameType.ADVANCED_202, isDefault: true }
];
const counts = requiredCardTypes.map(cardType => ({ cardType, _count: { _all: 1 } }));

function fixture(options: { mode?: GameMode; type?: GameType; status?: GameStatus; role?: SystemRole; selected?: boolean; unplayable?: string[]; extraSets?: typeof sets; advancedCards?: string[]; publicGame?: boolean } = {}) {
  const availableSets = [...sets, ...(options.extraSets ?? [])];
  const originalPlayers = [{ id: "player", userId: "owner", role: "PLAYER", status: "JOINED", figurine: "fox", dreamCellIndex: 5 }];
  let game: any = {
    id: "room", title: "Сохранить название", mode: options.mode ?? GameMode.MULTIPLAYER,
    gameType: options.type ?? GameType.CLASSIC_101, status: options.status ?? GameStatus.WAITING,
    rulesVersion: 2, cardSetId: options.type === GameType.ADVANCED_202 ? "advanced" : "classic",
    maxPlayers: 6, isPublic: options.publicGame ?? false, isTest: false,
    scheduledAt: options.publicGame ? new Date("2030-01-01T12:00:00Z") : null,
    scheduleTimeZone: options.publicGame ? "Asia/Vladivostok" : null, scheduleRevision: 0,
    settings: { gameTypeSelected: options.selected ?? true, timeLimitMinutes: options.mode === GameMode.SOLO ? null : 120, periodCount: 3, cardDecks: { old: [1] } },
    players: structuredClone(originalPlayers)
  };
  let writes = 0;
  const tx = {
    $queryRaw: async () => [{ id: "room" }],
    game: {
      findUniqueOrThrow: async () => game,
      update: async ({ data }: any) => { writes++; game = { ...game, ...data }; return game; }
    }
  };
  const prisma = {
    user: { findUniqueOrThrow: async () => ({ role: options.role ?? SystemRole.ADMIN, timeZone: "Europe/Moscow" }) },
    cardSet: {
      findUnique: async ({ where }: any) => availableSets.find(set => set.id === where.id) ?? null,
      findMany: async ({ where }: any) => availableSets.filter(set => !where.gameType || set.gameType === where.gameType)
        .map(set => ({ ...set, cards: set.gameType === GameType.ADVANCED_202 ? (options.advancedCards ?? Object.keys(rules202)).map(slug => ({ slug })) : [] }))
    },
    card: {
      findMany: async () => Object.keys(rules202).map(slug => ({ slug })),
      groupBy: async ({ by, where }: any) => by.includes("cardSetId")
        ? availableSets.filter(set => !options.unplayable?.includes(set.id)).flatMap(set => counts.map(row => ({ ...row, cardSetId: set.id })))
        : options.unplayable?.includes(where.cardSetId) ? [] : counts
    },
    $transaction: async (fn: (client: unknown) => Promise<unknown>) => fn(tx)
  };
  const service = new GamesService(prisma as never);
  Object.assign(service, {
    ensureCanManageGame: async () => undefined,
    appendEvents: async () => undefined,
    initialCardDecks: async (_tx: unknown, id: string) => ({ selectedSet: id }),
    actionResult: async () => ({ snapshot: { game } })
  });
  return { service, game: () => game, writes: () => writes, originalPlayers };
}

test("наборы разделяются по режиму, а не названию", async () => {
  const { service } = fixture();
  for (const mode of ["101", "202"] as const) {
    const available = await service.listPlayableCardSets(mode);
    assert.equal(available.length, 1);
    assert.equal(available[0]!.gameType, mode);
    assert.equal(available[0]!.id, mode === "101" ? "classic" : "advanced");
  }
});

for (const [mode, setId] of [["101", "advanced"], ["202", "classic"]] as const) {
  test(`API отклоняет чужой набор для режима ${mode}`, async () => {
    const f = fixture();
    await assert.rejects(f.service.updateLobby("room", "owner", { gameType: mode, cardSetId: setId }), /не подходит/);
    assert.equal(f.writes(), 0);
  });
}

test("101 → 202 → 101 сохраняет участников, фишки, мечты и настройки, заменяя колоды", async () => {
  const f = fixture({ role: SystemRole.HOST, selected: false });
  await f.service.updateLobby("room", "owner", { gameType: "202" });
  assert.equal(f.game().gameType, GameType.ADVANCED_202);
  assert.equal(f.game().cardSetId, "advanced");
  assert.equal(f.game().settings.gameTypeSelected, true);
  assert.deepEqual(f.game().settings.cardDecks, { selectedSet: "advanced" });
  assert.equal(f.game().title, "Сохранить название");
  assert.equal(f.game().settings.timeLimitMinutes, 120);
  assert.equal(f.game().settings.periodCount, 3);
  assert.deepEqual(f.game().players, f.originalPlayers);
  await f.service.updateLobby("room", "owner", { gameType: "101" });
  assert.equal(f.game().cardSetId, "classic");
  assert.deepEqual(f.game().settings.cardDecks, { selectedSet: "classic" });
  assert.deepEqual(f.game().players, f.originalPlayers);
});

test("владелец одиночной партии выбирает набор своего режима без ограничения времени", async () => {
  const f = fixture({ mode: GameMode.SOLO, role: SystemRole.USER, selected: false });
  await f.service.updateLobby("room", "owner", { gameType: "202", cardSetId: "advanced" });
  assert.equal(f.game().cardSetId, "advanced");
  assert.equal(f.game().settings.timeLimitMinutes, null);
  await assert.rejects(f.service.updateLobby("room", "owner", { isPublic: true }), /только режим и набор/);
});

test("выбор режима не расширяет права ведущего на произвольный набор командной игры", async () => {
  const f = fixture({ role: SystemRole.HOST });
  await assert.rejects(f.service.updateLobby("room", "owner", { gameType: "202", cardSetId: "advanced" }), /только администратор/);
  assert.equal(f.writes(), 0);
  await f.service.updateLobby("room", "owner", { gameType: "202" });
  assert.equal(f.game().gameType, GameType.ADVANCED_202);
});

test("первый выбор режима обязателен перед остальными настройками и стартом", async () => {
  const f = fixture({ selected: false });
  await assert.rejects(f.service.updateLobby("room", "owner", { title: "Новое название" }), /Сначала выберите режим/);
  await assert.rejects(f.service.startGame("room", "owner"), /Сначала выберите режим/);
  assert.equal(f.writes(), 0);
});

for (const status of [GameStatus.IN_PROGRESS, GameStatus.PAUSED, GameStatus.ENDED, GameStatus.CANCELLED]) {
  test(`смена режима запрещена в состоянии ${status}`, async () => {
    const f = fixture({ status });
    await assert.rejects(f.service.updateLobby("room", "owner", { gameType: "202" }), /до начала игры/);
    assert.equal(f.writes(), 0);
  });
}

test("повторное сохранение режима сохраняет выбранную колоду", async () => {
  const f = fixture();
  await f.service.updateLobby("room", "owner", { gameType: "101" });
  assert.deepEqual(f.game().settings.cardDecks, { old: [1] });
});

test("DTO отвергают неизвестный и пустой режим", async () => {
  for (const gameType of ["303", null]) {
    for (const dto of [new UpdateLobbyDto(), new PlayableCardSetsQueryDto(), new CreateGameDto(), new CreateSoloGameDto()]) {
      Object.assign(dto, { gameType });
      assert((await validate(dto)).some(error => error.property === "gameType"));
    }
  }
});

test("неполный набор 202 не появляется среди доступных", async () => {
  const f = fixture({ advancedCards: Object.keys(rules202).slice(0, 4) });
  assert.deepEqual(await f.service.listPlayableCardSets("202"), []);
});

test("если основной набор неполон, выбирается готовый набор того же режима", async () => {
  const f = fixture({ unplayable: ["classic"], extraSets: [{ id: "backup", name: "Дополнительный", gameType: GameType.CLASSIC_101, isDefault: false }] });
  const internal = f.service as unknown as { requirePlayableCardSet: () => Promise<{ id: string }> };
  assert.equal((await internal.requirePlayableCardSet()).id, "backup");
});

test("черновик доступен с готовым 202, даже если нет готового набора 101", async () => {
  const f = fixture({ unplayable: ["classic"] });
  const internal = f.service as unknown as { cardSetForCreation: () => Promise<{ id: string; gameType: GameType }> };
  assert.equal((await internal.cardSetForCreation()).gameType, GameType.ADVANCED_202);
});

test("первый выбор режима заменяет ставший недоступным временный набор", async () => {
  const f = fixture({ selected: false, role: SystemRole.HOST, unplayable: ["classic"], extraSets: [{ id: "backup", name: "Дополнительный", gameType: GameType.CLASSIC_101, isDefault: false }] });
  await f.service.updateLobby("room", "owner", { gameType: "101" });
  assert.equal(f.game().cardSetId, "backup");
  assert.equal(f.game().settings.gameTypeSelected, true);
});

test("первое подтверждение режима готовит актуальную колоду даже при прежнем наборе", async () => {
  const f = fixture({ selected: false });
  await f.service.updateLobby("room", "owner", { gameType: "101" });
  assert.deepEqual(f.game().settings.cardDecks, { selectedSet: "classic" });
});

test("автосохранение отдельных полей не меняет расписание и часовой пояс", async () => {
  const f = fixture({ publicGame: true });
  const scheduledAt = f.game().scheduledAt;
  await f.service.updateLobby("room", "owner", { title: "Новое название" });
  await f.service.updateLobby("room", "owner", { maxPlayers: 8 });
  await f.service.updateLobby("room", "owner", { timeLimitMinutes: 180 });
  assert.equal(f.game().title, "Новое название");
  assert.equal(f.game().maxPlayers, 8);
  assert.equal(f.game().settings.timeLimitMinutes, 180);
  assert.equal(f.game().scheduledAt, scheduledAt);
  assert.equal(f.game().scheduleTimeZone, "Asia/Vladivostok");
  assert.equal(f.game().scheduleRevision, 0);
});

test("изменение названия не добавляет таймер в существующую партию без ограничения времени", async () => {
  const f = fixture();
  f.game().settings.timeLimitMinutes = null;
  await f.service.updateLobby("room", "owner", { title: "Другое название" });
  assert.equal(f.game().settings.timeLimitMinutes, null);
});

test("null не подтверждает режим нового черновика", async () => {
  const f = fixture({ selected: false });
  await assert.rejects(f.service.updateLobby("room", "owner", { gameType: null } as unknown as UpdateLobbyDto), /Выберите режим/);
  assert.equal(f.writes(), 0);
});
