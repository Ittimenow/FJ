import assert from "node:assert/strict";
import test from "node:test";
import {
  changeStockCostCents,
  changeStockQuantity,
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
});

test("пересчитывает стоимость в доступное целое количество акций", () => {
  assert.equal(stockQuantityForCostCents(300, 20_000), 66);
  assert.equal(stockQuantityForCostCents(300, 299), "");
});

test("изменяет количество шагами 1, 20 и 100", () => {
  assert.equal(changeStockQuantity("", 1), 1);
  assert.equal(changeStockQuantity(1, 20), 21);
  assert.equal(changeStockQuantity(21, 100), 121);
  assert.equal(changeStockQuantity(20, -20), "");
});

test("изменяет стоимость шагами 1, 200 и 1000 долларов", () => {
  assert.equal(changeStockCostCents(1, 100, 100), 2);
  assert.equal(changeStockCostCents(2, 100, 20_000), 202);
  assert.equal(changeStockCostCents(202, 100, 100_000), 1_202);
  assert.equal(changeStockCostCents(1_202, 100, -100_000), 202);
});
