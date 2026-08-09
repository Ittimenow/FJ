import assert from "node:assert/strict";
import test from "node:test";
import { gameEndPresentation } from "./game-end-result";

test("оставляет победное состояние без иконки и подписи", () => {
  assert.deepEqual(gameEndPresentation({ reason: null, winnerName: "Анна" }), {
    icon: null,
    tone: "victory",
    title: "Победа!",
    description: null
  });
});

test("классифицирует все серверные причины завершения", () => {
  const cases = [
    ["financial_freedom", null, "Победа!"],
    ["bots_eliminated", "shield-check", "Вы победили!"],
    ["time_limit", "hourglass", "Время истекло"],
    ["human_bankrupt", "user-x", "Вы выбыли"],
    ["all_players_bankrupt", "circle-off", "Все игроки выбыли"]
  ] as const;

  for (const [reason, icon, title] of cases) {
    const result = gameEndPresentation({ reason });
    assert.equal(result.icon, icon);
    assert.equal(result.title, title);
  }
});

test("не приравнивает неизвестную причину к истечению времени", () => {
  assert.deepEqual(gameEndPresentation({ reason: "legacy_reason" }), {
    icon: "circle-alert",
    tone: "neutral",
    title: "Игра окончена",
    description: "Причина завершения не указана"
  });
});
