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
