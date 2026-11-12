import assert from "node:assert/strict";
import test from "node:test";
import { command202, newGame202, public202, realtimeEvents, type Public202, type State202 } from "@cashflow/shared";
import { GamesService, sealedPublic202 } from "./games.service";

function auctionState() {
  const state = newGame202(["first", "second", "third"].map(id => ({
    id, salary: 1000, passive: 0, expenses: 300, savings: 100000, childCost: 100, dream: 0, loans: []
  })), () => 0);
  state.queue = [{ id: "sealed-auction", kind: "auction", playerId: "first", candidates: ["first", "second", "third"], bids: {} }];
  state.after = "end";
  return command202(state, "first", { revision: state.revision, type: "decide", taskId: "sealed-auction", choice: "bid", amount: 987654 }, () => 0);
}

function room(state: State202, events: unknown[] = []) {
  return {
    id: "room", gameType: "ADVANCED_202", game202State: state, status: "IN_PROGRESS", mode: "MULTIPLAYER",
    rulesVersion: 2, settings: {}, currentTurnIndex: 0, currentRound: 1, isTest: false, startedAt: null,
    fastTrackWorld: null, players: [], cardSet: null, cardSetId: "202", events, chatMessages: []
  };
}

test("public 202 auction state preserves response markers without disclosing amounts or changing settlement", () => {
  const state = auctionState();
  state.queue[0]!.bids!.second = 0;
  const view = sealedPublic202(state);
  assert.deepEqual(view.queue[0]!.bids, { first: 0, second: 0 });
  assert.equal(Object.hasOwn(view.queue[0]!.bids!, "third"), false, "an unanswered player can still submit a bid");
  assert.equal(JSON.stringify(view).includes("987654"), false);
  assert.equal("decks" in view, false);
  assert.equal(state.queue[0]!.bids!.first, 987654, "the authoritative bid must stay exact");
  const before = state.players[0]!.cash;
  const settled = command202(state, "third", { revision: state.revision, type: "decide", taskId: "sealed-auction", choice: "pass" }, () => 0);
  assert.equal(settled.players[0]!.permanentCharity, true);
  assert.equal(settled.players[0]!.cash, before - 987654 + Math.floor(987654 / 10));
});

test("sealed projection also redacts queued and resumed auctions", () => {
  const state = auctionState();
  state.queue = [{ id: "outer", kind: "right", playerId: "second", resume: state.queue[0]! },
    { id: "later", kind: "auction", playerId: "second", candidates: ["first", "second"], bids: { second: 456789 } }];
  const view = sealedPublic202(state);
  assert.deepEqual(view.queue[0]!.resume!.bids, { first: 0 });
  assert.deepEqual(view.queue[1]!.bids, { second: 0 });
  assert.equal(JSON.stringify(view).includes("456789"), false);
  assert.equal(state.queue[0]!.resume!.bids!.first, 987654);
});

test("game API redacts both the live auction and previously saved event snapshots", async () => {
  const state = auctionState();
  const legacySnapshot = { game: { gameType: "202", game202: public202(state) }, players: [] };
  const legacyEvent = { id: "old-event", type: realtimeEvents.stateUpdate, payload: {}, stateSnapshot: legacySnapshot };
  const game = room(state, [legacyEvent]);
  const prisma = {
    game: { findUniqueOrThrow: async () => game },
    gameEvent: { findMany: async () => [] },
    card: { findMany: async () => [] }
  };
  const service = new GamesService(prisma as never);
  Object.assign(service, { ensureGameAccess: async () => undefined, syncGameTimelineIfNeeded: async () => undefined });
  const snapshot = await service.getGame("room", "viewer");
  assert.deepEqual(snapshot.game202!.queue[0]!.bids, { first: 0 });
  const saved = snapshot.events[0]!.stateSnapshot as unknown as typeof legacySnapshot;
  assert.deepEqual(saved.game.game202.queue[0]!.bids, { first: 0 });
  assert.equal(JSON.stringify(snapshot).includes("987654"), false, "an old state-update event must not bypass redaction");
  assert.equal(legacySnapshot.game.game202.queue[0]!.bids!.first, 987654, "read projection does not rewrite stored history");
  assert.equal(state.queue[0]!.bids!.first, 987654);
});

test("new durable state-update snapshots contain only auction response markers", async () => {
  const state = auctionState();
  const saved: Array<{ stateSnapshot?: { game: { game202: Public202 } } }> = [];
  const tx = {
    game: { findUniqueOrThrow: async () => room(state) },
    gameEvent: {
      count: async () => 0,
      createMany: async ({ data }: { data: typeof saved }) => saved.push(...data)
    }
  };
  const service = new GamesService({} as never);
  const append = (service as unknown as { appendEvents: (tx: unknown, id: string, actor: null, events: unknown[]) => Promise<void> }).appendEvents.bind(service);
  await append(tx, "room", null, [{ type: realtimeEvents.stateUpdate, payload: { reason: "game202_action" } }]);
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0]!.stateSnapshot!.game.game202.queue[0]!.bids, { first: 0 });
  assert.equal(JSON.stringify(saved).includes("987654"), false);
  assert.equal(state.queue[0]!.bids!.first, 987654);
});

test("replay cannot disclose auction amounts from older saved snapshots", async () => {
  const state = auctionState();
  const snapshots = [{ game202: public202(state) }, { game: { game202: public202(state) } }];
  const events = snapshots.map((stateSnapshot, index) => ({ id: `saved-${index}`, stateSnapshot }));
  const service = new GamesService({ gameEvent: { findMany: async () => events } } as never);
  Object.assign(service, { ensureGameAccess: async () => undefined });
  const replay = await service.replay("room", "viewer");
  assert.equal(replay.events.length, 2);
  assert.equal(JSON.stringify(replay).includes("987654"), false);
  for (const event of replay.events) {
    const snapshot = event.stateSnapshot as unknown as { game202?: Public202; game?: { game202: Public202 } };
    assert.deepEqual((snapshot.game202 ?? snapshot.game!.game202).queue[0]!.bids, { first: 0 });
  }
  assert.equal(JSON.stringify(events).includes("987654"), true, "stored historical snapshots are not mutated");
});
