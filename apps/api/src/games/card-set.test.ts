import assert from "node:assert/strict";
import test from "node:test";
import { CardType } from "@prisma/client";
import { GamesService } from "./games.service";
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

test("новая партия без выбора набора использует «Оригинал»", async () => {
  const service = new GamesService({
    cardSet: {
      findFirst: async (query: { where: { name: { equals: string } } }) => {
        assert.equal(query.where.name.equals, "Оригинал");
        return { id: "original-id", name: "Оригинал" };
      }
    },
    card: {
      groupBy: async () => requiredCardTypes.map((cardType) => ({ cardType, _count: { _all: 1 } }))
    }
  } as never);

  const selected = await (service as unknown as { requirePlayableCardSet: () => Promise<{ id: string }> }).requirePlayableCardSet();
  assert.equal(selected.id, "original-id");
});
