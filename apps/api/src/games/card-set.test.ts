import assert from "node:assert/strict";
import test from "node:test";
import { CardType, GameType } from "@prisma/client";
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

test("новая партия выбирает основной набор своего режима независимо от названия", async () => {
  const service = new GamesService({
    cardSet: {
      findMany: async (query: { where: { gameType: GameType }; orderBy: unknown[] }) => {
        assert.equal(query.where.gameType, GameType.CLASSIC_101);
        assert.deepEqual(query.orderBy[0], { isDefault: "desc" });
        return [{ id: "original-id", name: "Переименованный набор", gameType: GameType.CLASSIC_101, cards: [] }];
      },
      findUnique: async () => ({ id: "original-id", name: "Переименованный набор", gameType: GameType.CLASSIC_101 })
    },
    card: {
      groupBy: async () => requiredCardTypes.map((cardType) => ({ cardSetId: "original-id", cardType, _count: { _all: 1 } }))
    }
  } as never);

  const selected = await (service as unknown as { requirePlayableCardSet: () => Promise<{ id: string }> }).requirePlayableCardSet();
  assert.equal(selected.id, "original-id");
});
