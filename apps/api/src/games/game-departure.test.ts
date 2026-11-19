import assert from "node:assert/strict";
import test from "node:test";
import { newGame202, removePlayer202, command202, type State202 } from "@cashflow/shared";
import { GamesService } from "./games.service";

const initial202 = () => newGame202(["a", "b", "c"].map(id => ({ id, salary: 300000, passive: 0, expenses: 100000, savings: 1000000, childCost: 10000, dream: 5, loans: [] })), () => 0);

test("202 departure advances current turn, preserves input and rejects future commands", () => {
  const before = initial202();
  const next = removePlayer202(before, "a", () => 0);
  assert.equal(before.players.length, 3);
  assert.equal(next.players[next.current]?.id, "b");
  assert.equal(next.queue[0]?.playerId, "b");
  assert.equal(next.revision, before.revision + 1);
  assert.throws(() => command202(next, "a", { revision: next.revision, type: "loan", amount: 100000 }, () => 0), /Игрок не найден/);
});
test("202 departure outside turn removes offers and nested rights without losing the owner's task", () => {
  const state = initial202();
  state.queue = [{ id: "right", playerId: "b", kind: "right", resume: { id: "deal", playerId: "a", kind: "deal" } }];
  state.offers = [{ id: "joint", kind: "joint", from: "a", to: "c", shares: { a: 5000, b: 5000 }, price: 100, accepted: [], turn: 1 }];
  const next = removePlayer202(state, "b", () => 0);
  assert.equal(next.players[next.current]?.id, "a");
  assert.equal(next.queue[0]?.id, "deal");
  assert.equal(next.offers.length, 0);
});
test("202 sealed auction completes when the only unanswered bidder leaves", () => {
  const state = initial202();
  state.queue = [{ id: "auction", kind: "auction", playerId: "a", candidates: ["b", "c"], bids: { b: 100 } }];
  const cash = state.players[1]!.cash;
  const next = removePlayer202(state, "c", () => 0);
  assert.equal(next.players.find(p => p.id === "b")!.permanentCharity, true);
  assert.equal(next.players.find(p => p.id === "b")!.cash, cash - 100);
  assert.notEqual(next.queue[0]?.kind, "auction");
});
test("202 last departure ends decisions without manufacturing a winner", () => {
  let state: State202 = initial202();
  for (const id of ["c", "b", "a"]) state = removePlayer202(state, id, () => 0);
  assert.equal(state.players.length, 0);
  assert.equal(state.queue.length, 0);
  assert.equal(state.winner, null);
});

function fixture(index = 0, pendingAction: any = null) {
  const players = ["a", "b", "c"].map((id, seat) => ({ id, userId: id, role: "PLAYER", status: "JOINED", controller: id === "c" ? "BOT" : "HUMAN", seat, figurine: "cat", guestName: id }));
  const game: any = { id: "game", mode: "MULTIPLAYER", createdById: "host", status: "IN_PROGRESS", gameType: "CLASSIC_101", currentTurnIndex: index, currentRound: 1, players, settings: { pendingAction } };
  const events: any[] = [];
  const tx: any = {
    game: { findUniqueOrThrow: async () => game, update: async ({ data }: any) => Object.assign(game, data) },
    gamePlayer: { update: async ({ where, data }: any) => Object.assign(players.find(p => p.id === where.id)!, data) }
  };
  const service = new GamesService({ $transaction: async (fn: any) => fn(tx), game: { findUnique: async () => game }, user: { findUniqueOrThrow: async ({ where }: any) => ({ role: where.id === "admin" ? "ADMIN" : where.id === "host" ? "HOST" : "USER", status: "ACTIVE" }) } } as never) as any;
  service.lockGame = async () => {};
  service.ensureGameAccess = async () => {};
  service.appendEvents = async (_tx: any, _game: any, _actor: any, emitted: any[]) => events.push(...emitted);
  service.actionResult = async () => ({ game, events });
  return { service, game, players, events };
}
test("101 removal before current seat preserves the current player and chosen token", async () => {
  const f = fixture(2);
  await f.service.departPlayer("game", "host", "a");
  assert.equal(f.game.currentTurnIndex, 1);
  assert.equal(f.players[0]!.status, "KICKED");
  assert.equal(f.players[0]!.figurine, "cat");
  assert.equal(f.events[0].type, "player:expelled");
});
test("101 voluntary exit cancels its pending decision and advances to the next seat", async () => {
  const f = fixture(0, { type: "choose_deal", gamePlayerId: "a" });
  await f.service.departPlayer("game", "a");
  assert.equal(f.game.currentTurnIndex, 0);
  assert.equal(f.game.settings.pendingAction ?? null, null);
  assert.equal(f.players[0]!.status, "LEFT");
  assert.equal(f.game.status, "IN_PROGRESS");
  await assert.rejects(f.service.departPlayer("game", "a"), /уже выбыл/);
});
test("101 a departing market respondent cannot block the current turn", async () => {
  const f = fixture(0, { type: "market_sale", gamePlayerId: "b", cardId: 1, title: "Sale", assetId: "asset", assetName: "House", salePriceCents: 100, mortgageCents: 0, proceedsCents: 100, cashflowCents: 10, netCashflowChangeCents: -10, cashflowAdjustmentCents: 0, offerNumber: 1, totalOffers: 1, remainingOffers: [] });
  await f.service.departPlayer("game", "b");
  assert.equal(f.game.settings.pendingAction ?? null, null);
  assert.equal(f.game.currentTurnIndex, 1);
});
test("host and admin can remove bots, ordinary players cannot remove others", async () => {
  for (const actor of ["host", "admin"]) {
    const f = fixture();
    await f.service.departPlayer("game", actor, "c");
    assert.equal(f.players[2]!.status, "KICKED");
  }
  const f = fixture();
  await assert.rejects(f.service.departPlayer("game", "a", "b"), /ведущ|администратор|прав/i);
  assert.equal(f.players[1]!.status, "JOINED");
});
test("last participant leaving ends the game without a winner", async () => {
  const f = fixture();
  await f.service.departPlayer("game", "host", "c");
  await f.service.departPlayer("game", "b");
  await f.service.departPlayer("game", "a");
  assert.equal(f.game.status, "ENDED");
  assert.equal(f.events.find(e => e.type === "game:ended").payload.reason, "all_players_departed");
});

test("paused games allow departure without resuming the remaining players", async () => {
  const f = fixture(); f.game.status = "PAUSED";
  await f.service.departPlayer("game", "a");
  assert.equal(f.game.status, "PAUSED");
  assert.equal(f.players[0]!.status, "LEFT");
});
test("fast-track ownership and influence stop affecting active players after departure", async () => {
  const f = fixture(); f.game.fastTrackWorld = { owners: { 1: "a", 3: "b" }, influence: { 4: ["a", "b"] } };
  await f.service.departPlayer("game", "a");
  assert.deepEqual(f.game.fastTrackWorld.owners, { 3: "b" });
  assert.deepEqual(f.game.fastTrackWorld.influence, { 4: ["b"] });
  const state = initial202();state.players[0]!.track = "FAST_TRACK";
  state.world.owners[1] = "a";state.world.influence[4] = ["a", "b"];
  const next = removePlayer202(state, "a", () => 0);
  assert.equal(next.world.owners[1], undefined);
  assert.deepEqual(next.world.influence[4], ["b"]);
});
test("explicit departure prevents the unattended-solo pause from stopping bots", async () => {
  let paused = false;
  const service = new GamesService({ $transaction: async (fn: any) => fn({
    game: { findUnique: async () => ({ id: "game", mode: "SOLO", status: "IN_PROGRESS", settings: {} }), updateMany: async () => { paused = true; } },
    gamePlayer: { findFirst: async () => null }
  }) } as never);
  await service.pauseSoloGameWhenUnattended("game");
  assert.equal(paused, false);
});
