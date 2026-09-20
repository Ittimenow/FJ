import assert from "node:assert/strict";
import test from "node:test";
import { gameChatNotices } from "./game-chat-notices";

const createdAt = new Date("2026-09-20T10:00:00Z");
const game = { id: "game-1", isTest: true, createdAt };
const players = [{ id: "anna", guestName: null, user: { displayName: "Анна" } }];
const event = (id: string, type: string, payload: unknown = {}) => ({
  id, type, payload, gamePlayerId: "anna", createdAt: new Date("2026-09-20T10:05:00Z")
});

test("test-game notice survives reloads with one stable identity and no user impersonation", () => {
  const first = gameChatNotices(game, [], players);
  assert.deepEqual(gameChatNotices(game, [], players), first);
  assert.equal(first.length, 1);
  assert.equal(first[0]?.body, "Тестовая партия · результаты не учитываются в статистике и не публикуются");
  assert.equal(first[0]?.sender, "ADMINISTRATOR");
  assert.equal(first[0]?.user, null);
  assert.deepEqual(gameChatNotices({ ...game, isTest: false }, [], players), []);
});

test("repeated synchronization does not duplicate an event, but separate pauses remain distinct", () => {
  const pause = event("pause-1", "game:paused", { reason: "manual" });
  const nextPause = event("pause-2", "game:paused", { reason: "manual" });
  const messages = gameChatNotices(game, [pause, pause, nextPause], players);
  assert.equal(messages.length, 3);
  assert.equal(new Set(messages.map((message) => message.id)).size, 3);
  assert.deepEqual(gameChatNotices(game, [pause, nextPause], players), messages);
});

test("timeline messages explain the pause reason and the next period", () => {
  const messages = gameChatNotices({ ...game, isTest: false }, [
    event("pause", "game:paused", { reason: "period_complete", currentPeriod: 1 }),
    event("resume", "game:resumed", { startsNextPeriod: true, currentPeriod: 2 }),
    event("left", "game:paused", { reason: "player_left" }),
    event("irrelevant", "game:state_update"),
    event("turn", "player:roll_dice", { dice: [6] })
  ], players);
  assert.equal(messages.length, 3);
  assert.match(messages[0]!.body, /Период 1 завершён/);
  assert.equal(messages[1]!.body, "Начался период 2.");
  assert.match(messages[2]!.body, /после выхода игрока/);
});

test("bankruptcy and winner messages identify the affected player", () => {
  const messages = gameChatNotices({ ...game, isTest: false }, [
    event("recovered", "bankruptcy:recovered", { turnsToSkip: 3 }),
    event("eliminated", "bankruptcy:eliminated"),
    event("ended", "game:ended", { winnerGamePlayerId: "anna" })
  ], players);
  assert.match(messages[0]!.body, /Анна: банкротство преодолено.*3/);
  assert.match(messages[1]!.body, /Анна:.*выбыл из игры/);
  assert.equal(messages[2]!.body, "Партия завершена. Победитель: Анна.");
});
