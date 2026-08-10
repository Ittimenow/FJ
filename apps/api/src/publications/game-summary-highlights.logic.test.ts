import assert from "node:assert/strict";
import test from "node:test";
import type { SummaryPlayerFacts } from "./game-summary.logic";
import { selectGameHighlights } from "./game-summary-highlights.logic";

const players: SummaryPlayerFacts[] = [
  player("max", "Макс", 8500),
  player("denis", "Денис", 1200),
  player("cat", "Котик", 0)
];

test("highlights rank meaningful events, distribute attention and clean card titles", () => {
  const highlights = selectGameHighlights([
    {
      sequence: 10,
      type: "deal:buy",
      gamePlayerId: "max",
      payload: {
        title: "Предприятие на продажу: $200,000, +$2,700/мес",
        cashflowCents: 270000
      }
    },
    {
      sequence: 11,
      type: "deal:buy",
      gamePlayerId: "cat",
      payload: {
        title: "Дом на продажу: $70,000, +$300/мес",
        cashflowCents: 30000
      }
    }
  ], players, "max");

  assert.equal(highlights.length, 3);
  assert.deepEqual(highlights.map((highlight) => highlight.playerId), ["denis", "cat", "max"]);
  assert.match(highlights[0]?.text ?? "", /Денис: денежный поток вырос на 12 \$/);
  assert.match(highlights[1]?.text ?? "", /актив «Дом» добавил 300 \$/);
  assert.match(highlights[2]?.text ?? "", /актив «Предприятие» добавил 2 700 \$/);
  assert.ok(highlights.every((highlight) => !highlight.text.includes("на продажу:")));
});

test("a comeback outranks a later routine purchase by the same player", () => {
  const highlights = selectGameHighlights([
    {
      sequence: 3,
      type: "bankruptcy:recovered",
      gamePlayerId: "denis",
      payload: {}
    },
    {
      sequence: 20,
      type: "deal:buy",
      gamePlayerId: "denis",
      payload: { title: "Небольшой бизнес", cashflowCents: 100 }
    }
  ], players, "max");

  const denis = highlights.find((highlight) => highlight.playerId === "denis");
  assert.equal(denis?.kind, "bankruptcy:recovered");
  assert.match(denis?.text ?? "", /восстановление после банкротства/);
});

function player(id: string, mention: string, cashflowDeltaCents: number): SummaryPlayerFacts {
  return {
    id,
    name: mention,
    mention,
    profession: null,
    figurine: null,
    finalCashCents: 0,
    finalCashflowCents: cashflowDeltaCents,
    finalPassiveIncomeCents: cashflowDeltaCents,
    cashflowDeltaCents,
    passiveIncomeDeltaCents: cashflowDeltaCents,
    assetsCount: 1,
    track: id === "max" ? "FAST_TRACK" : "RAT_RACE",
    status: "JOINED"
  };
}
