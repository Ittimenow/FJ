export type StockQuantity = number | "";

export function normalizeStockQuantity(value: number | ""): StockQuantity {
  if (value === "") return "";
  const normalized = Math.floor(Number(value));
  return Number.isFinite(normalized) && normalized >= 1 ? normalized : "";
}

export function stockPurchaseCostCents(
  unitPriceCents: number,
  quantity: StockQuantity
) {
  const normalizedQuantity = normalizeStockQuantity(quantity);
  return normalizedQuantity === "" ? 0 : unitPriceCents * normalizedQuantity;
}

export function stockQuantityForCostCents(
  unitPriceCents: number,
  costCents: number
): StockQuantity {
  if (!Number.isFinite(unitPriceCents) || unitPriceCents <= 0) return "";
  if (!Number.isFinite(costCents) || costCents < unitPriceCents) return "";
  return Math.floor(costCents / unitPriceCents);
}

export function maxStockQuantityForCashCents(
  unitPriceCents: number,
  availableCashCents: number
) {
  if (!Number.isFinite(unitPriceCents) || unitPriceCents <= 0) return 0;
  if (!Number.isFinite(availableCashCents) || availableCashCents <= 0) return 0;
  return Math.floor(availableCashCents / unitPriceCents);
}

export function canAffordPurchaseCents(
  availableCashCents: number,
  purchaseCostCents: number
) {
  return (
    Number.isFinite(availableCashCents) &&
    Number.isFinite(purchaseCostCents) &&
    purchaseCostCents >= 0 &&
    availableCashCents >= purchaseCostCents
  );
}

export function changeStockQuantity(
  quantity: StockQuantity,
  delta: number
): StockQuantity {
  const current = normalizeStockQuantity(quantity);
  return normalizeStockQuantity((current === "" ? 0 : current) + delta);
}

export function changeStockCostCents(
  quantity: StockQuantity,
  unitPriceCents: number,
  deltaCents: number
): StockQuantity {
  const currentCostCents = stockPurchaseCostCents(unitPriceCents, quantity);
  return stockQuantityForCostCents(
    unitPriceCents,
    Math.max(0, currentCostCents + deltaCents)
  );
}
