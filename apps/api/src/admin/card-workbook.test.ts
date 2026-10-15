import assert from "node:assert/strict";
import test from "node:test";
import { CardType } from "@prisma/client";
import * as XLSX from "xlsx";
import { cardDifferences, readCardWorkbook, writeCardWorkbook, type WorkbookCard } from "./card-workbook";

const setId = "00000000-0000-0000-0000-000000000001";
const card: WorkbookCard = {
  id: 42,
  cardSetId: setId,
  cardType: CardType.SMALL_DEAL,
  slug: "house_42",
  title: "Дом 3М/2В",
  bodyText: "Взнос $5 000. Доход $160.",
  category: "realestate",
  subcategory: null,
  isActive: true,
  meta: [{ metaKey: "price", metaValue: "65000" }],
  effects: [{ effectType: "cash.adjust", amountCents: -5000, payload: { mandatory: true } }],
  conditions: [{ condType: "has_children", payload: {} }]
};

test("Excel .xls сохраняет все данные карточки и набора", () => {
  const file = writeCardWorkbook([{ id: setId, name: "Основной набор", isDefault: true }], [card]);
  const parsed = readCardWorkbook(file);
  assert.deepEqual(parsed.sets, [{ id: setId, name: "Основной набор", isDefault: true }]);
  assert.deepEqual(parsed.cards, [card]);
});

test("изменение вложенных эффектов видно при сравнении", () => {
  const changed = { ...card, effects: [{ ...card.effects[0]!, amountCents: -6000 }] };
  assert.deepEqual(cardDifferences(card, changed), ["effects"]);
});

test("повторяющиеся карточки отклоняются до импорта", () => {
  const file = writeCardWorkbook([{ id: setId, name: "Набор", isDefault: true }], [card, { ...card, id: 43 }]);
  assert.throws(() => readCardWorkbook(file), /повторяются/);
});

test("ошибка в JSON вложенных данных отклоняет файл", () => {
  const book = XLSX.read(writeCardWorkbook([{ id: setId, name: "Набор", isDefault: true }], [card]), { type: "buffer" });
  book.Sheets["Карточки"]!["J2"] = { t: "s", v: "{broken" };
  const file = XLSX.write(book, { type: "buffer", bookType: "biff8" }) as Buffer;
  assert.throws(() => readCardWorkbook(file), /JSON-массив/);
});
