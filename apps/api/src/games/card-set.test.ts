import assert from "node:assert/strict";
import test from "node:test";
import { CardType } from "@prisma/client";
import { missingCardTypes, requiredCardTypes } from "./card-set";

test("complete card set is playable", () => {
  const missing = missingCardTypes(
    requiredCardTypes.map((cardType) => ({ cardType, count: 1 }))
  );

  assert.deepEqual(missing, []);
});

test("inactive or absent card types keep a card set from being playable", () => {
  const missing = missingCardTypes([
    { cardType: CardType.SMALL_DEAL, count: 3 },
    { cardType: CardType.BIG_DEAL, count: 0 },
    { cardType: CardType.DOODAD, count: 2 },
    { cardType: CardType.MARKET, count: 1 },
    { cardType: CardType.FAST_TRACK, count: 1 }
  ]);

  assert.deepEqual(missing, [CardType.BIG_DEAL]);
});
