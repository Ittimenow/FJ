import assert from "node:assert/strict";
import test from "node:test";
import { interleavePlayers, nextAvailableSeat } from "./game-seating";

test("назначает первое свободное место без верхней границы", () => {
  assert.equal(nextAvailableSeat([1, 2, 3, 4, 5, 6]), 7);
  assert.equal(nextAvailableSeat([1, 2, 4, 7]), 3);
});

test("игнорирует недопустимые номера мест", () => {
  assert.equal(nextAvailableSeat([0, -1, 1, 2.5]), 2);
});

test("распределяет ботов между людьми и сохраняет всех участников", () => {
  const players = ["bot-1", "bot-2", "bot-3", "human-1", "human-2"];
  const order = interleavePlayers(players, (player) => player.startsWith("bot"), () => 0);
  assert.deepEqual([...order].sort(), [...players].sort());
  const adjacentBots = order.filter((player, index) => player.startsWith("bot") && order[(index + 1) % order.length]!.startsWith("bot"));
  assert.equal(adjacentBots.length, 1);
});

test("при достаточном числе людей боты не ходят подряд", () => {
  const order = interleavePlayers(["bot-1", "bot-2", "human-1", "human-2", "human-3"], (player) => player.startsWith("bot"), () => 0.5);
  assert.equal(order.some((player, index) => player.startsWith("bot") && order[(index + 1) % order.length]!.startsWith("bot")), false);
});
