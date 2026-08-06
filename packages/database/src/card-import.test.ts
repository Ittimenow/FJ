import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";
import { classifyCardChanges, type ImportCard, validateCardBatch } from "./card-import";

const sourceFile = resolve(process.cwd(), "../../dist/recognized_original_cards_ru.json");
const source = JSON.parse(readFileSync(sourceFile, "utf8")) as unknown;

test("validates the complete recognized deck", () => {
  const result = validateCardBatch(source);
  assert.deepEqual(result.errors, []);
  assert.equal(result.cards.length, 139);
  assert.equal(result.cards.filter((card) => card.cardType === "SMALL_DEAL").length, 56);
  assert.equal(result.cards.filter((card) => card.cardType === "BIG_DEAL").length, 41);
  assert.equal(result.cards.filter((card) => card.cardType === "DOODAD").length, 42);
});

test("preserves direct game money amounts and represented mechanics", () => {
  const result = validateCardBatch(source);
  const cards = result.cards;
  const television = cards.find((card) => card.title.includes("телевизор с большим экраном"));
  const boat = cards.find((card) => card.title.startsWith("Новый катер"));
  const toys = cards.find((card) => card.title.startsWith("Купите детям игрушки"));
  const split = cards.find((card) => card.title === "Дробление акций OK4U");
  const conditional = cards.find((card) => card.title.startsWith("Жилец наносит ущерб"));
  const stock = cards.find((card) => card.title === "Акции OK4U: $30");
  const deal = cards.find((card) => card.title === "Дуплекс на продажу: $70,000, +$140/мес");

  assert.equal(television?.meta.find((row) => row.metaKey === "credit_payment")?.metaValue, "120");
  assert.deepEqual(boat?.effects.map((effect) => effect.amountCents), [-1000, 17000]);
  assert.equal(toys?.effects[0]?.amountCents, -50);
  assert.equal(toys?.meta.find((row) => row.metaKey === "per_child")?.metaValue, "true");
  assert.equal(split?.effects[0]?.effectType, "asset.quantity.multiply");
  assert.equal(conditional?.conditions[0]?.condType, "has_rental_realestate");
  assert.equal(stock?.meta.find((row) => row.metaKey === "symbol")?.metaValue, "OK4U");
  assert.equal(deal?.meta.find((row) => row.metaKey === "down_payment")?.metaValue, "7000");
});

test("rejects duplicate slugs, duplicate meta keys and unknown actions", () => {
  const valid = (source as ImportCard[])[0]!;
  const invalid = {
    ...structuredClone(valid),
    effects: [{ effectType: "unknown.action", amountCents: 1, payload: {} }],
    meta: [...valid.meta, valid.meta[0]]
  };
  const result = validateCardBatch([valid, invalid]);
  assert.ok(result.errors.some((error) => error.message.includes("slug повторяется")));
  assert.ok(result.errors.some((error) => error.message.includes("Повторяющийся metaKey")));
  assert.ok(result.errors.some((error) => error.message.includes("Неподдерживаемый effectType")));
});

test("rejects stock actions without a symbol and inconsistent financing", () => {
  const cards = source as ImportCard[];
  const split = structuredClone(cards.find((card) => card.title === "Дробление акций OK4U")!);
  split.meta = [];
  const deal = structuredClone(cards.find((card) => card.title === "Дуплекс на продажу: $70,000, +$140/мес")!);
  deal.meta.find((row) => row.metaKey === "down_payment")!.metaValue = "1000";
  const result = validateCardBatch([split, deal]);
  assert.ok(result.errors.some((error) => error.message.includes("meta.symbol")));
  assert.ok(result.errors.some((error) => error.message.includes("mortgage + down_payment")));
});

test("classifies a repeated import as unchanged", () => {
  const cards = validateCardBatch(source).cards;
  const repeated = classifyCardChanges(cards, structuredClone(cards));
  assert.equal(repeated.created.length, 0);
  assert.equal(repeated.updated.length, 0);
  assert.equal(repeated.unchanged.length, 139);

  const changed = structuredClone(cards);
  changed[0]!.bodyText += " ";
  assert.equal(classifyCardChanges(changed, cards).updated.length, 1);
});
