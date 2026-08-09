export type StockSaleOfferIdentity = {
  cardId: number;
  symbol: string;
  salePriceCents: number;
};

export type StockSaleQuantity = number | "";

export function stockSaleResetKey(
  offer: StockSaleOfferIdentity | null
) {
  if (!offer) return null;
  return `${offer.cardId}:${offer.symbol.toLowerCase()}:${offer.salePriceCents}`;
}

export function normalizeStockSaleQuantity(
  value: StockSaleQuantity,
  maxQuantity: number
): StockSaleQuantity {
  if (value === "") return "";
  const normalizedMax = Math.max(Math.floor(Number(maxQuantity) || 1), 1);
  const normalizedValue = Math.max(Math.floor(Number(value) || 1), 1);
  return Math.min(normalizedValue, normalizedMax);
}
