import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GamesService } from "./games.service";
import { assetRealEstate, cardRealEstate, realEstateAssetName, realEstateFromText } from "./real-estate";

const cards = JSON.parse(readFileSync("../../dist/recognized_original_cards_ru.json", "utf8"));
const apartment = cards.find((card: { slug: string }) => card.slug.includes("small_1_r4c3"));

test("structured identity wins over the other home mentioned in a sale story", () => {
  assert.match(apartment.bodyText, /2\/1.*3\/2/s);
  assert.equal(cardRealEstate(apartment)?.target, "house2u");
  assert.equal(cardRealEstate({ ...apartment, subcategory: null })?.target, "house2u");
  assert.equal(assetRealEstate({ name: apartment.title, sourceCard: apartment })?.target, "house2u");
  assert.match(realEstateAssetName({ name: apartment.title, sourceCard: apartment }), /2\/1/);
});

test("physical-deck residential cards retain their exact type and unit count", () => {
  for (const card of cards.filter((card: any) => ["house2u", "house3m", "duplex", "4plex", "8plex"].includes(card.subcategory) && card.cardType !== "MARKET")) {
    const type = card.subcategory;
    const expected = type === "house2u" ? "2/1" : type === "house3m" ? "3/2" : type === "duplex" ? "2Plex" : type === "4plex" ? "4Plex" : "8Plex";
    assert.equal(cardRealEstate(card)?.label, expected, card.slug);
    assert.ok(realEstateAssetName({ name: card.title, sourceCard: card }).includes(expected));
  }
  for (const [name, units] of [["2У коттедж", 1], ["3М дом", 1], ["4Plex", 4], ["24-квартирный дом", 24], ["60 квартир", 60]] as const) {
    assert.equal(realEstateFromText(name)?.units, units, name);
  }
  assert.equal(realEstateFromText("24-квартирные апартаменты")?.target, "apartment");
});

test("market offers include only the requested home type, even for old generic asset names", async () => {
  const service = new GamesService({} as never) as any;
  const assets = [apartment, ...["house3m", "4plex", "8plex"].map(type => cards.find((card: any) => card.subcategory === type && card.cardType !== "MARKET"))].map((card, index) => ({
    id: `asset-${index}`, gamePlayerId: `player-${index}`, name: card.title, type: "realestate", sourceCard: card,
    gamePlayer: { seat: index }, costBasisCents: 100_000n, downPaymentCents: 10_000n, cashflowCents: 160n
  }));
  const tx = { playerAsset: { findMany: async () => assets } };
  const market = (title: string, bodyText = "") => ({ title, bodyText, slug: "custom", subcategory: null, meta: [{ metaKey: "price", metaValue: "65000" }] });
  for (const [card, expected] of [
    [market("Покупатель квартиры 2/1"), ["asset-0"]],
    [market("Покупатель дома 3/2"), ["asset-1"]],
    [market("Покупатель 4Plex"), ["asset-2"]],
    [market("Покупатель Plex", "Покупает дуплексы, 4-плексы и 8-плексы по $65000 за каждую квартиру"), ["asset-2", "asset-3"]]
  ] as const) {
    const rule = service.marketRule(card);
    const offers = await service.findMarketSaleOffers(tx, "game", "player-0", card, rule);
    assert.deepEqual(offers.map((offer: any) => offer.assetId), expected, card.title);
    if (expected.length === 2) assert.deepEqual(offers.map((offer: any) => offer.salePriceCents), [260_000, 520_000]);
  }
});
