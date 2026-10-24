import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chooseBotName, normalizeBotName, validBotName } from "./bot-names";
import { createBotPlayers } from "./games.service";

const names = JSON.parse(readFileSync(resolve(process.cwd(), "../../packages/database/prisma/data/bot-names.json"), "utf8")) as string[];

test("начальный список содержит 50 уникальных допустимых имён", () => {
  assert.equal(names.length, 50);
  assert.equal(new Set(names.map((name) => name.toLocaleLowerCase("ru-RU"))).size, 50);
  assert.ok(names.every(validBotName));
  assert.equal(normalizeBotName("  Милфа   Света  "), "Милфа Света");
  assert.equal(validBotName("Анка пулеметчица"), false);
  assert.equal(validBotName("Одно Два Три"), false);
});

test("11 ботов получают разные имена и фишки рядом с человеком", () => {
  const occupied = new Set<string>();
  const selected: string[] = [];
  for (let index = 0; index < 11; index += 1) {
    const name = chooseBotName(names, occupied, () => 0);
    assert.ok(name);
    selected.push(name);
    occupied.add(name.toLocaleLowerCase("ru-RU"));
  }
  const players = createBotPlayers(selected, new Set(["robot"]));
  assert.equal(players.length, 11);
  assert.equal(new Set(players.map((player) => player.guestName)).size, 11);
  assert.equal(new Set(players.map((player) => player.figurine)).size, 11);
  assert.ok(players.every((player) => player.figurine !== "robot"));
  assert.equal(new Set(players.map((player) => player.dreamCellIndex)).size, 11);
});
