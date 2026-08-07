import assert from "node:assert/strict";
import test from "node:test";
import {
  canAffordPurchaseCents,
  changeStockCostCents,
  changeStockQuantity,
  maxStockQuantityForCashCents,
  normalizeStockQuantity,
  stockPurchaseCostCents,
  stockQuantityForCostCents
} from "./stock-purchase-calculation";

test("оставляет покупку акций пустой до выбора пользователя", () => {
  assert.equal(normalizeStockQuantity(""), "");
  assert.equal(normalizeStockQuantity(0), "");
  assert.equal(stockPurchaseCostCents(500, ""), 0);
});

test("пересчитывает стоимость из целого количества акций", () => {
  assert.equal(normalizeStockQuantity(20.9), 20);
  assert.equal(stockPurchaseCostCents(500, 20), 10_000);
  assert.equal(stockPurchaseCostCents(30, 30), 900);
});

test("пересчитывает стоимость в доступное целое количество акций", () => {
  assert.equal(stockQuantityForCostCents(300, 20_000), 66);
  assert.equal(stockQuantityForCostCents(30, 900), 30);
  assert.equal(stockQuantityForCostCents(300, 299), "");
});

test("выбирает максимум акций на текущие наличные", () => {
  assert.equal(maxStockQuantityForCashCents(30, 900), 30);
  assert.equal(maxStockQuantityForCashCents(30, 29), 0);
  assert.equal(maxStockQuantityForCashCents(0, 900), 0);
});

test("разрешает покупку только при достаточном количестве наличных", () => {
  assert.equal(canAffordPurchaseCents(10_000, 10_000), true);
  assert.equal(canAffordPurchaseCents(10_000, 10_001), false);
  assert.equal(canAffordPurchaseCents(10_000, 0), true);
  assert.equal(canAffordPurchaseCents(Number.NaN, 10_000), false);
});

test("изменяет количество шагами 10 и 100", () => {
  assert.equal(changeStockQuantity("", 10), 10);
  assert.equal(changeStockQuantity(10, 100), 110);
  assert.equal(changeStockQuantity(110, -10), 100);
  assert.equal(changeStockQuantity(100, -100), "");
});

test("изменяет стоимость шагами 500 и 1000 долларов", () => {
  assert.equal(changeStockCostCents(1, 100, 500), 6);
  assert.equal(changeStockCostCents(6, 100, 1_000), 16);
  assert.equal(changeStockCostCents(16, 100, -500), 11);
  assert.equal(changeStockCostCents(11, 100, -1_000), 1);
});
