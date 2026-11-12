import assert from "node:assert/strict";
import test from "node:test";
import { LobbyAutosaveQueue, prepareLobbyPatch, type LobbyDraft, type LobbyPatch, type LobbySaveResult } from "./lobby-autosave";

const initial: LobbyDraft = { title: "Партия", maxPlayers: 6, timeLimitMinutes: 90, periodCount: 1, isPublic: false, scheduledLocal: "" };
const context = { occupied: 2, timeZone: "Europe/Moscow", isTest: false, now: Date.parse("2026-11-12T00:00:00Z") };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function deferred() {
  let resolve!: (result: LobbySaveResult) => void;
  let reject!: (cause: Error) => void;
  const promise = new Promise<LobbySaveResult>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function queueWith(save: (patch: LobbyPatch) => Promise<LobbySaveResult>) {
  return new LobbyAutosaveQueue({ values: initial, revision: 1 }, {
    save, prepare: (draft, saved, ready) => prepareLobbyPatch(draft, saved, ready, context)
  });
}

test("autosave groups rapid typing into the latest title", async () => {
  const calls: LobbyPatch[] = [];
  const queue = queueWith(async patch => { calls.push(patch); return { values: { ...initial, ...patch }, revision: 2 }; });
  queue.change("title", "Н", 20);
  queue.change("title", "Новая", 20);
  queue.change("title", "Новая партия", 20);
  assert.equal(queue.getState().pending, true);
  await new Promise(resolve => setTimeout(resolve, 35));
  assert.deepEqual(calls, [{ title: "Новая партия" }]);
  assert.equal(queue.getState().pending, false);
});

test("autosave serializes requests and sends edits made during the preceding request", async () => {
  const first = deferred(), second = deferred();
  const calls: LobbyPatch[] = [];
  const queue = queueWith(patch => { calls.push(patch); return calls.length === 1 ? first.promise : second.promise; });
  queue.change("title", "Первое название");
  queue.change("title", "Последнее название");
  queue.change("periodCount", 3);
  assert.deepEqual(calls, [{ title: "Первое название" }]);
  first.resolve({ values: { ...initial, title: "Первое название" }, revision: 2 });
  await tick();
  assert.deepEqual(calls[1], { title: "Последнее название", periodCount: 3 });
  assert.equal(queue.getState().draft.title, "Последнее название");
  second.resolve({ values: { ...initial, title: "Последнее название", periodCount: 3 }, revision: 3 });
  await tick();
  assert.equal(queue.getState().pending, false);
});

test("a reverted field is restored on the server after an older in-flight save", async () => {
  const first = deferred();
  const calls: LobbyPatch[] = [];
  const queue = queueWith(patch => {
    calls.push(patch);
    return calls.length === 1 ? first.promise : Promise.resolve({ values: initial, revision: 3 });
  });
  queue.change("maxPlayers", 8);
  queue.change("maxPlayers", 6);
  first.resolve({ values: { ...initial, maxPlayers: 8 }, revision: 2 });
  await tick();
  assert.deepEqual(calls, [{ maxPlayers: 8 }, { maxPlayers: 6 }]);
  assert.equal(queue.getState().pending, false);
});

test("realtime updates refresh untouched fields without overwriting a local draft or accepting old snapshots", () => {
  const queue = queueWith(async () => { throw new Error("unexpected save"); });
  queue.change("title", "Мой черновик", 10000);
  queue.receive({ values: { ...initial, title: "Другой ведущий", maxPlayers: 9 }, revision: 3 });
  assert.equal(queue.getState().draft.title, "Мой черновик");
  assert.equal(queue.getState().draft.maxPlayers, 9);
  queue.receive({ values: initial, revision: 2 });
  assert.equal(queue.getState().draft.maxPlayers, 9);
  // Reverting to the acknowledged value also cancels the delayed request.
  queue.change("title", "Другой ведущий");
  assert.equal(queue.getState().pending, false);
});

test("a failed save keeps its draft and remains pending until a successful retry", async () => {
  let calls = 0;
  const queue = queueWith(async patch => {
    if (++calls === 1) throw new Error("Нет связи");
    return { values: { ...initial, ...patch }, revision: 2 };
  });
  queue.change("timeLimitMinutes", 120);
  await tick();
  assert.equal(queue.getState().error, "Нет связи");
  assert.equal(queue.getState().draft.timeLimitMinutes, 120);
  assert.equal(queue.getState().pending, true);
  queue.retry();
  await tick();
  assert.equal(calls, 2);
  assert.equal(queue.getState().error, null);
  assert.equal(queue.getState().pending, false);
});

test("publication waits for a complete schedule while unrelated settings save normally", () => {
  const draft = { ...initial, title: "Новая партия", isPublic: true, scheduledLocal: "2027-02-" };
  assert.deepEqual(prepareLobbyPatch(draft, initial, new Set(["title", "isPublic", "scheduledLocal"]), context), { title: "Новая партия" });
  draft.scheduledLocal = "2027-02-14T18:30";
  assert.deepEqual(prepareLobbyPatch(draft, initial, new Set(["isPublic", "scheduledLocal"]), context), { isPublic: true, scheduledLocal: "2027-02-14T18:30" });
  assert.deepEqual(prepareLobbyPatch(draft, initial, new Set(["isPublic", "scheduledLocal"]), { ...context, timeZone: null }), {});
  draft.scheduledLocal = "2027-02-31T18:30";
  assert.deepEqual(prepareLobbyPatch(draft, initial, new Set(["isPublic", "scheduledLocal"]), context), {});
  draft.scheduledLocal = "2026-11-12T02:30";
  assert.deepEqual(prepareLobbyPatch(draft, initial, new Set(["isPublic", "scheduledLocal", "title"]), context), { title: "Новая партия" });
});

test("empty titles do not block other valid fields and closing a game does not send an obsolete date", () => {
  const draft = { ...initial, title: " ", periodCount: 2 };
  assert.deepEqual(prepareLobbyPatch(draft, initial, new Set(["title", "periodCount"]), context), { periodCount: 2 });
  assert.deepEqual(prepareLobbyPatch({ ...draft, scheduledLocal: "2027-04-20T12:00" }, { ...initial, isPublic: true }, new Set(["isPublic", "scheduledLocal"]), context), { isPublic: false });
});

test("a delayed response cannot roll back a newer authoritative snapshot", async () => {
  const request = deferred();
  const queue = queueWith(() => request.promise);
  queue.change("title", "Моё название");
  queue.receive({ values: { ...initial, title: "Более новая правка", maxPlayers: 7 }, revision: 5 });
  request.resolve({ values: { ...initial, title: "Моё название" }, revision: 4 });
  await tick();
  assert.equal(queue.getState().draft.title, "Более новая правка");
  assert.equal(queue.getState().draft.maxPlayers, 7);
  assert.equal(queue.getState().pending, false);
});

test("an existing unlimited game retains its null duration when another field is saved", async () => {
  const unlimited = { ...initial, timeLimitMinutes: null };
  const calls: LobbyPatch[] = [];
  const queue = new LobbyAutosaveQueue({ values: unlimited, revision: 1 }, {
    prepare: (draft, saved, ready) => prepareLobbyPatch(draft, saved, ready, context),
    save: async patch => { calls.push(patch); return { values: { ...unlimited, ...patch }, revision: 2 }; }
  });
  queue.change("title", "Без лимита");
  await tick();
  assert.deepEqual(calls, [{ title: "Без лимита" }]);
  assert.equal(queue.getState().draft.timeLimitMinutes, null);
  assert.equal(queue.getState().pending, false);
});

test("a pending player limit resumes saving when a participant leaves", async () => {
  let occupied = 5;
  const calls: LobbyPatch[] = [];
  const queue = new LobbyAutosaveQueue({ values: initial, revision: 1 }, {
    prepare: (draft, saved, ready) => prepareLobbyPatch(draft, saved, ready, { ...context, occupied }),
    save: async patch => { calls.push(patch); return { values: { ...initial, ...patch }, revision: 3 }; }
  });
  queue.change("maxPlayers", 4);
  assert.equal(calls.length, 0);
  assert.equal(queue.getState().pending, true);
  occupied = 3;
  queue.receive({ values: initial, revision: 2 });
  await tick();
  assert.deepEqual(calls, [{ maxPlayers: 4 }]);
  assert.equal(queue.getState().pending, false);
});
