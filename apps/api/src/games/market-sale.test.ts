import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  isRentalRealEstateAsset,
  marketAssetUnits,
  marketSalePriceForUnits
} from "./market-sale";

test("determines every supported Plex and apartment size", () => {
  const cases: Array<[string, number]> = [
    ["Duplex: $45,000", 2],
    ["4-Plex: $100,000", 4],
    ["8-Plex: $240,000", 8],
    ["12-квартирный дом", 12],
    ["24 квартиры", 24],
    ["60 квартирный комплекс", 60]
  ];

  for (const [text, expected] of cases) {
    assert.equal(marketAssetUnits(text.toLowerCase()), expected, text);
  }
});

test("calculates market price per block or apartment", () => {
  assert.equal(marketSalePriceForUnits(25000n, "8-plex"), 200000n);
  assert.equal(marketSalePriceForUnits(25000n, "60 квартир"), 1500000n);
});

test("distinguishes rental homes from other small-deal assets", () => {
  assert.equal(isRentalRealEstateAsset("realestate 2У коттедж: $40,000"), true);
  assert.equal(isRentalRealEstateAsset("realestate 3M дом: $50,000"), true);
  assert.equal(isRentalRealEstateAsset("realestate 24-квартирные апартаменты"), true);
  assert.equal(isRentalRealEstateAsset("realestate Part Time: циркониевые браслеты"), false);
  assert.equal(isRentalRealEstateAsset("realestate Займ брату под залог дома"), false);
  assert.equal(isRentalRealEstateAsset("realestate 10 га земли"), false);
  assert.equal(isRentalRealEstateAsset("realestate Редкая золотая монета"), false);
});

test("seed data preserves original real-estate cards", () => {
  const seed = readFileSync(resolve(process.cwd(), "../../dist/seed_cards.sql"), "utf8");
  const cards = seed.split(/(?=INSERT INTO cards )/);
  const matchingCards = (title: string) => cards.filter((card) => card.includes(`'${title}'`));

  assert.equal(matchingCards("8-квартирный дом: $240,000, +$950/мес").length, 2);

  const plex220 = matchingCards("8-квартирный дом: $220,000, +$1,700/мес")[0] ?? "";
  assert.match(plex220, /'down_payment', '40000'/);
  assert.match(plex220, /'cash_delta', -40000/);

  assert.equal(matchingCards("4-квартирный дом: $140,000, +$2,000/мес").length, 1);
  assert.equal(matchingCards("4-квартирный дом: $90,000, +$500/мес").length, 1);
  assert.equal(matchingCards("24-квартирные апартаменты: $575,000, +$3,400/мес").length, 1);

  const apartments60 =
    matchingCards("60-квартирные апартаменты: $1,200,000, +$11,000/мес")[0] ?? "";
  assert.match(apartments60, /60-квартирный комплекс/);
  assert.match(apartments60, /'realestate', NULL\)/);
});

test("seed data preserves original small-deal classifications and finances", () => {
  const seed = readFileSync(resolve(process.cwd(), "../../dist/seed_cards.sql"), "utf8");
  const smallDeals = seed
    .split(/(?=INSERT INTO cards )/)
    .filter((card) => card.includes("VALUES ('small_deal'"));
  const matchingCard = (title: string) =>
    smallDeals.find((card) => card.includes(`'${title}'`)) ?? "";

  assert.equal(smallDeals.length, 99);
  assert.match(matchingCard("2У коттедж: $40,000, +$220/мес"), /'mortgage', '35000'/);
  assert.match(matchingCard("2У коттедж: $55,000, +$160/мес"), /'mortgage', '50000'/);
  assert.match(matchingCard("3M коттедж: $65,000, +$160/мес"), /'mortgage', '60000'/);
  assert.match(matchingCard("Парт Тайм: финансовое обучение - $5,000"), /'business', NULL\)/);
  assert.match(matchingCard("Займ брату под залог дома: $5,000"), /'loan', NULL\)/);
  assert.match(matchingCard("10 га земли: $5,000"), /'land', NULL\)/);
  assert.match(matchingCard("Редкая золотая монета: $500"), /'collectible', NULL\)/);

  for (const card of smallDeals) {
    const values = Object.fromEntries(
      [...card.matchAll(/meta_key, meta_value\) VALUES \(@cid, '([^']+)', '([^']*)'/g)].map(
        (match) => [match[1], Number(match[2])]
      )
    );
    if (values.price === undefined || values.down_payment === undefined) continue;
    assert.equal(
      values.price - (values.mortgage ?? 0),
      values.down_payment,
      card.match(/VALUES \('small_deal', '[^']+', '([^']+)'/)?.[1]
    );
  }
});

test("seed data preserves all doodads and payment rules", () => {
  const seed = readFileSync(resolve(process.cwd(), "../../dist/seed_cards.sql"), "utf8");
  const doodads = seed
    .split(/(?=INSERT INTO cards )/)
    .filter((card) => card.includes("VALUES ('doodad'"));
  const matchingCard = (title: string) => doodads.find((card) => card.includes(`'${title}'`)) ?? "";

  assert.equal(doodads.length, 45);
  assert.match(matchingCard("Запрещенное рыболовство в водоохранной зоне: $100"), /'cash_delta', -100/);
  assert.match(matchingCard("Встреча с выпускниками института: $250"), /'cash_delta', -250/);
  assert.match(matchingCard("Отпуск с семьей: $2,000"), /'cash_delta', -2000/);

  const glider = matchingCard("Новый водный глиссер: $1,000 + кредит $17,000");
  assert.match(glider, /'cash_delta', -1000/);
  assert.match(glider, /'liability\.create', 17000/);
  assert.match(glider, /"paymentCents":340/);

  const toys = matchingCard("Новые игрушки для ваших детей: $50 за ребенка");
  assert.match(toys, /'per_child', 'true'/);
  assert.match(toys, /'has_children'/);

  const television = matchingCard("Новый телевизор с большим экраном: $4,000");
  assert.match(television, /'payment_choice', 'cash_or_credit'/);
  assert.match(television, /'cash_price', '4000'/);
  assert.match(television, /'credit_balance', '4000'/);
  assert.match(television, /'credit_payment', '120'/);
  assert.doesNotMatch(television, /'cash_delta'/);
  assert.doesNotMatch(television, /'cashflow_delta'/);
});
