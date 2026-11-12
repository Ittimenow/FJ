import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { classifyCardChanges, type ImportCard, validateCardBatch } from "./card-import";

const root = new URL("../../../", import.meta.url);
const cards = JSON.parse(readFileSync(new URL("dist/recognized_202_cards_ru.json", root), "utf8")) as ImportCard[];
const card = (group: string, id: string | number) => {
  const slug = `set_202_${group}_${String(id).replace(".", "_").padStart(2, "0")}`;
  const found = cards.find(row => row.slug === slug);
  assert.ok(found, slug);
  return found;
};
const meta = (row: ImportCard) => Object.fromEntries(row.meta.filter(item => !["game_type","game202_rule"].includes(item.metaKey)).map(item => [item.metaKey, item.metaValue]));

test("202: validates all 138 physical cards and preserves the four source decks", () => {
  assert.deepEqual(validateCardBatch(cards).errors, []);
  assert.equal(cards.length, 138);
  assert.equal(new Set(cards.map(row => row.slug)).size, 138);
  assert.deepEqual(Object.fromEntries(["SMALL_DEAL", "BIG_DEAL", "MARKET", "DOODAD"].map(type => [type, cards.filter(row => row.cardType === type).length])), {
    SMALL_DEAL: 36, BIG_DEAL: 36, MARKET: 42, DOODAD: 24
  });
});

test("202: every card declares its dedicated 202 rule", () => {
  assert.equal(cards.filter(row => row.isActive).length, 138);
  for (const row of cards) {
    const values = Object.fromEntries(row.meta.map(item => [item.metaKey, item.metaValue]));
    assert.equal(values.game_type, "202");
    assert.ok(JSON.parse(values.game202_rule!).kind);
  }
});

test("202: retains every financial field of the eleven capital property cards", () => {
  const expected = [
    [4, 52000, 46000, 6000, 20], [6, 52000, 48000, 4000, 10],
    [8, 30000, 0, 30000, 0], [9, 30000, 15000, 15000, -150],
    [19, 49000, 46000, 3000, 10], [20, 20000, 0, 20000, 0],
    [24, 46000, 40000, 6000, 20], [30, 40000, 20000, 20000, -200],
    [32, 60000, 51000, 9000, 300], [33, 36000, 34500, 1500, 150],
    [36, 52000, 50000, 2000, -10]
  ];
  for (const [id, price, mortgage, down, income] of expected) {
    assert.deepEqual(meta(card("capital", id!)), {
      price: String(price), mortgage: String(mortgage), down_payment: String(down), cashflow_monthly: String(income)
    });
  }
});

test("202: retains prices, mortgages, deposits and income of all seventeen cashflow properties", () => {
  const expected: Array<[string, number, number, number, number]> = [
    ["1.2", 200000, 160000, 40000, 1600], ["1.8", 230000, 200000, 30000, 1250],
    ["2.7", 60000, 48000, 12000, 400], ["2.8", 200000, 168000, 32000, 1500],
    ["2.9", 45000, 37000, 8000, 320], ["3.2", 100000, 80000, 20000, 800],
    ["3.3", 800000, 700000, 100000, 4500], ["3.4", 350000, 300000, 50000, 2000],
    ["3.5", 65000, 55000, 10000, 280], ["3.7", 80000, 64000, 16000, 750],
    ["4.2", 125000, 110000, 15000, 600], ["4.3", 50000, 42000, 8000, 240],
    ["4.4", 140000, 108000, 32000, 1500], ["4.5", 210000, 170000, 40000, 1700],
    ["4.6", 90000, 75000, 15000, 500], ["4.7", 650000, 585000, 65000, 2500],
    ["4.9", 1000000, 800000, 200000, 8000]
  ];
  for (const [id, price, mortgage, down, income] of expected) {
    assert.deepEqual(meta(card("cashflow", id)), {
      price: String(price), mortgage: String(mortgage), down_payment: String(down), cashflow_monthly: String(income)
    });
  }
});

test("202: royalties have a one-time purchase price and recurring income", () => {
  for (const [id, price, income] of [["1.5", 14000, 500], ["1.6", 8000, 200], ["3.1", 12000, 400], ["3.8", 8000, 250]] as const) {
    const row = card("cashflow", id);
    assert.equal(row.category, "royalty");
    assert.deepEqual(meta(row), { price: String(price), down_payment: String(price), cashflow_monthly: String(income) });
    assert.deepEqual(row.effects, []);
  }
});

test("202: expense loans do not double-count their monthly payments", () => {
  for (const [id, cash, monthly, debt, payment] of [[3, -25000, 0, 50000, 500], [13, -12000, -140, 20000, 260], [21, -3000, -150, 5000, 250]]) {
    const effects = card("doodad", id!).effects;
    assert.equal(effects.find(effect => effect.effectType === "cash.adjust")?.amountCents, cash);
    assert.equal(effects.find(effect => effect.effectType === "cashflow.adjust")?.amountCents ?? 0, monthly);
    const loan = effects.find(effect => effect.effectType === "liability.create");
    assert.equal(loan?.amountCents, debt);
    assert.equal(loan?.payload.paymentCents, payment);
    assert.ok(effects.every(effect => effect.payload.mandatory === true));
  }
  assert.deepEqual(card("doodad", 2).effects.map(effect => effect.amountCents), [-500, -100]);
  assert.deepEqual(card("doodad", 12).effects.map(effect => effect.amountCents), [-20000, -400]);
});

test("202: child expenses retain their conditions and per-child multiplication", () => {
  for (const id of [2, 4, 6, 10, 21]) assert.deepEqual(card("doodad", id).conditions, [{ condType: "has_children", payload: {} }]);
  assert.equal(meta(card("doodad", 6)).per_child, "true");
  assert.equal(card("doodad", 6).effects[0]?.amountCents, -50);
  assert.equal(card("doodad", 10).isActive, true);
  assert.deepEqual(meta(card("doodad", 10)), {
    payment_choice: "cash_or_credit", cash_price: "50000", credit_balance: "50000", credit_payment: "1000"
  });
  assert.equal(card("doodad", 15).isActive, true);
});

test("202: duplicate physical cards, uncertain amounts and original units are preserved", () => {
  assert.equal(card("cashflow", "1.9").bodyText, card("cashflow", "2.1").bodyText);
  assert.notEqual(card("cashflow", "1.9").slug, card("cashflow", "2.1").slug);
  assert.equal(cards.filter(row => row.title === "Сетевой маркетинг. Карточка № 1").length, 6);
  assert.match(card("capital", 32).bodyText, /\$3000/);
  assert.match(card("capital", 32).bodyText, /Первый взнос: \$9 000/);
  assert.doesNotMatch(card("capital", 32).bodyText, /Примечание к распознаванию/);
  for (const id of [8, 9, 20, 30]) {
    assert.match(card("capital", id).bodyText, /акров/);
    assert.match(card("capital", id).bodyText, /\?\?\?/);
    assert.doesNotMatch(card("capital", id).bodyText, /гектар/);
  }
  for (const id of [1, 3, 4, 21]) {
    assert.equal(card("market", id).isActive, true);
    assert.match(card("market", id).bodyText, /неразборчив/);
  }
});

test("202: repeated import produces no creates or updates", () => {
  const normalized = validateCardBatch(cards).cards;
  const first = classifyCardChanges(normalized, []);
  assert.equal(first.created.length, 138);
  const repeated = classifyCardChanges(normalized, structuredClone(normalized));
  assert.equal(repeated.created.length, 0);
  assert.equal(repeated.updated.length, 0);
  assert.equal(repeated.unchanged.length, 138);
});

test("202: generated JSON and review report match the unmodified source transcriptions", () => {
  const output = execFileSync(process.execPath, [fileURLToPath(new URL("scripts/prepare-202-cards.mjs", root)), "--check"], { encoding: "utf8" });
  assert.match(output, /138 карточек, 138 активны, 0 отключены/);
  const report = readFileSync(new URL("reports/card-set-202.md", root), "utf8");
  for (const row of cards) assert.ok(report.includes(`| ${row.slug} | ${row.title} | ${row.isActive ? "Активна" : "Отключена"} |`), row.slug);
});
