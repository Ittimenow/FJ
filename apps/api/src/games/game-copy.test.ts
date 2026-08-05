import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(resolve(__dirname, relativePath), "utf8");
}

test("игровой интерфейс не выводит англоязычные термины", () => {
  const gameRoom = source("../../../web/src/components/game/game-room.tsx");
  const dashboard = source("../../../web/src/app/dashboard/page.tsx");
  const board = source("../../../../packages/shared/src/board.ts");

  assert.doesNotMatch(gameRoom, /\bCashflow\b|\bcashflow\b(?=[^"\n]*[\p{Script=Cyrillic}])|Doodad"|Realtime-/u);
  assert.doesNotMatch(dashboard, /\bCashflow\b|\bcashflow\b/u);
  assert.doesNotMatch(board, /label:\s*"[^"]*[A-Za-z][^"]*"/u);
});

test("ошибки игрового сервера написаны по-русски", () => {
  const gamesService = source("./games.service.ts");

  assert.doesNotMatch(
    gamesService,
    /throw new (?:BadRequestException|ForbiddenException|NotFoundException|ConflictException)\("[^"]*[A-Za-z][^"]*"\)/u
  );
});

test("в текстах карточек нет непереведённых игровых терминов", () => {
  const cards = source("../../../../dist/seed_cards.sql");

  assert.doesNotMatch(
    cards,
    /\b(?:Cashflow|ROI|Part Time|Duplex|Plex|MBA|DVD)\b|Dolby Surround|РОИ|Малый бизнес: cashflow/u
  );
});
