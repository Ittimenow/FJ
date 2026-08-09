import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeStockSaleQuantity,
  stockSaleResetKey
} from "./stock-sale-state";

test("не считает обновлённый снимок той же продажи новым предложением", () => {
  const initialOffer = {
    cardId: 42,
    symbol: "OK4U",
    salePriceCents: 30
  };
  const refreshedOffer = {
    ...initialOffer,
    symbol: "ok4u"
  };

  assert.equal(stockSaleResetKey(initialOffer), stockSaleResetKey(refreshedOffer));
});

test("различает последовательные предложения по продаже", () => {
  assert.notEqual(
    stockSaleResetKey({ cardId: 42, symbol: "OK4U", salePriceCents: 30 }),
    stockSaleResetKey({ cardId: 43, symbol: "OK4U", salePriceCents: 30 })
  );
  assert.equal(stockSaleResetKey(null), null);
});

test("ограничивает количество продажи доступным диапазоном", () => {
  assert.equal(normalizeStockSaleQuantity("", 100), "");
  assert.equal(normalizeStockSaleQuantity(20.9, 100), 20);
  assert.equal(normalizeStockSaleQuantity(120, 100), 100);
  assert.equal(normalizeStockSaleQuantity(0, 100), 1);
});
