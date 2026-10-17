export const cardActionTypes = {
  cashAdjust: "cash.adjust",
  cashflowAdjust: "cashflow.adjust",
  liabilityCreate: "liability.create",
  assetQuantityMultiply: "asset.quantity.multiply",
  assetQuantityDivide: "asset.quantity.divide",
  assetWipeout: "asset.wipeout"
} as const;

export type CardActionType = (typeof cardActionTypes)[keyof typeof cardActionTypes];

export const legacyCardEffectAliases: Record<string, CardActionType> = {
  cash_delta: cardActionTypes.cashAdjust,
  conditional_cash_delta: cardActionTypes.cashAdjust,
  cashflow_delta: cardActionTypes.cashflowAdjust,
  stock_split: cardActionTypes.assetQuantityMultiply,
  stock_reverse_split: cardActionTypes.assetQuantityDivide,
  stock_wipeout: cardActionTypes.assetWipeout
};

export function dealDownPaymentAmount(
  meta: Record<string, unknown>,
  fallbackAmount: number
) {
  const rawAmount = meta.down_payment;
  if (rawAmount === null || rawAmount === undefined || rawAmount === "") {
    return fallbackAmount;
  }

  const amount = Number(
    typeof rawAmount === "string" ? rawAmount.replace(",", ".") : rawAmount
  );
  return Number.isFinite(amount) ? Math.round(amount) : fallbackAmount;
}

export function isDealAuctionOpportunity(category: string | null | undefined, cardText: string) {
  const normalizedCategory = category?.toLowerCase();
  if (normalizedCategory === "business" || normalizedCategory === "realestate") return true;
  const normalized = cardText.toLowerCase().replace(/ё/g, "е");
  if (/part\s*time|брат\s+просит|другу\s+срочно|монет|гектар|свободная\s+земл|циркониев/.test(normalized)) {
    return false;
  }
  return /(?:^|\s)(?:2у|3m|3м)(?:\s|$)|plex|duplex|коттедж|таунхаус|апартамент|квартирн(?:ый|ого)\s+(?:дом|комплекс)|дом:\s*\$/.test(normalized);
}
