import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import type { Rule202 } from "@cashflow/shared";

const require = createRequire(import.meta.url);
const { decks202, rules202, slug202 } = require("@cashflow/shared") as typeof import("@cashflow/shared");
const { game202CardContent } = require("./game-202-card-model") as typeof import("./game-202-card-model");
const card = (slug: string, rule?: Rule202) => game202CardContent({ slug, title: "Заголовок из набора", bodyText: "Полный текст\nкарточки из набора" }, rule);
const text = (rows: string[] | undefined) => (rows ?? []).join("\n").replace(/[\u00a0\u202f]/g, " ");

test("all 202 cards retain their real deck, title and full text without inferring a deck from prose", () => {
  const labels = { capital: ["SMALL_DEAL", "Прирост капитала"], cashflow: ["BIG_DEAL", "Денежный поток"], market: ["MARKET", "Рынок"], doodad: ["DOODAD", "Всякая всячина"] };
  for (const [deck, slugs] of Object.entries(decks202)) for (const slug of slugs) {
    const result = card(slug);
    assert.deepEqual([result.cardType, result.typeLabel], labels[deck as keyof typeof labels], slug);
    assert.equal(result.title, "Заголовок из набора");
    assert.equal(result.bodyText, "Полный текст\nкарточки из набора");
    assert((result.financialDetails?.length ?? 0) + (result.effectDetails?.length ?? 0) > 0, slug);
    assert.doesNotMatch(text([...result.financialDetails!, ...result.effectDetails!]), /undefined|NaN/, slug);
  }
  const unknown = game202CardContent({ slug: "custom", title: "Рынок — Прирост капитала", bodyText: "1000 долларов" });
  assert.deepEqual(unknown, { cardType: "", typeLabel: "Карточка", title: "Рынок — Прирост капитала", bodyText: "1000 долларов", financialDetails: [], effectDetails: [] });
});

test("property terms distinguish the property's down payment, actual fee and additional repair debt", () => {
  const fee = card(slug202("capital", 32));
  assert.match(text(fee.financialDetails), /Первоначальный взнос: 9 000 \$/);
  assert.match(text(fee.financialDetails), /Оплата при покупке: 3 000 \$/);
  assert.match(text(fee.effectDetails), /Денежный поток: 300 \$\/мес/);
  const repair = card(slug202("market", 1));
  assert.match(text(repair.financialDetails), /кредит на ремонт: 12 000 \$/);
  assert.match(text(repair.effectDetails), /поток объекта: 200 \$\/мес/);
  assert.match(text(repair.effectDetails), /Платёж по кредиту на ремонт: 1 200 \$\/мес/);
  assert.doesNotMatch(text(card(slug202("market", 29)).effectDetails), /Платёж по кредиту/);
});

test("option terms keep per-share premiums and strikes without inventing an order quantity", () => {
  const result = card(slug202("capital", 1));
  assert.match(text(result.financialDetails), /Премия за акцию: 4 \$/);
  assert.match(text(result.financialDetails), /Цена исполнения за акцию: 10 \$/);
  assert.match(text(result.financialDetails), /от 100 до 5 000 акций, кратно 100/);
  assert.doesNotMatch(text(result.financialDetails), /400 \$/);
  assert.match(text(result.effectDetails), /третьего следующего собственного хода/);
});

test("D2Y differentiates the paid entry level and income that requires prior levels", () => {
  const first = card(slug202("capital", 18));
  assert.match(text(first.financialDetails), /Разовая оплата: 200 \$/);
  assert.match(text(first.effectDetails), /Самостоятельного дохода нет/);
  const second = card(slug202("cashflow", "1.3"));
  assert.match(text(second.financialDetails), /при наличии уровня 1/);
  assert.match(text(second.effectDetails), /Доход после активации: 1 000 \$\/мес/);
  const third = card(slug202("cashflow", "2.3"));
  assert.match(text(third.financialDetails), /при наличии уровней 1 и 2/);
  assert.match(text(third.effectDetails), /5 000 \$\/мес/);
});

test("expenses retain conditional applicability, per-child costs and alternative university financing", () => {
  const perChild = card(slug202("doodad", 6));
  assert.match(text(perChild.financialDetails), /при наличии детей/);
  assert.match(text(perChild.effectDetails), /на каждого ребёнка: 50 \$/);
  const threshold = card(slug202("doodad", 15));
  assert.match(text(threshold.financialDetails), /пассивный доход больше 500 \$\/мес/);
  const university = card(slug202("doodad", 10));
  assert.match(text(university.financialDetails), /Оплата наличными: 50 000 \$/);
  assert.match(text(university.financialDetails), /Или кредит: 50 000 \$/);
  assert.match(text(university.effectDetails), /При выборе кредита — платёж 1 000 \$\/мес/);
  const debt = card(slug202("doodad", 13));
  assert.match(text(debt.effectDetails), /Расход: 12 000 \$/);
  assert.match(text(debt.effectDetails), /Новый долг: 20 000 \$/);
  assert.match(text(debt.effectDetails), /Платёж по долгу: 260 \$\/мес/);
});

test("market sale and exchange terms do not confuse whole-object prices, per-unit prices or multipliers", () => {
  assert.match(text(card(slug202("market", 11)).financialDetails), /150% стоимости объекта/);
  assert.doesNotMatch(text(card(slug202("market", 11)).financialDetails), /1,50|1,5 \$/);
  assert.match(text(card(slug202("market", 15)).financialDetails), /Цена за 10 акров: 125 000 \$/);
  assert.match(text(card(slug202("market", 25)).financialDetails), /Цена продажи за квартиру: 35 000 \$/);
  assert.match(text(card(slug202("market", 12)).financialDetails), /Цена продажи объекта: 85 000 \$/);
  const exchange = card(slug202("market", 19));
  assert.match(text(exchange.financialDetails), /Для обмена нужен жилой дом/);
  assert.doesNotMatch(text(exchange.financialDetails), /Первоначальный взнос|Оплата при покупке/);
});

test("rule overrides preserve dollar fractions and signed recurring effects", () => {
  const property = card(slug202("capital", 4), { kind: "property", cost: 2000.01, down: 500.25, mortgage: 1499.76, income: -12.34, units: 1, acres: 0, house: true });
  assert.match(text(property.financialDetails), /Цена: 2 000,01 \$/);
  assert.match(text(property.financialDetails), /Первоначальный взнос: 500,25 \$/);
  assert.match(text(property.effectDetails), /-12,34 \$\/мес/);
  assert.match(text(card(slug202("market", 42)).effectDetails), /\+30 \$\/мес за квартиру/);
  assert.match(text(card(slug202("market", 3)).effectDetails), /-50 \$\/мес за квартиру/);
  assert.equal(rules202[slug202("capital", 4)]!.kind, "property");
});
