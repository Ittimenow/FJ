export function marketAssetUnits(assetText: string) {
  if (/60[\s-]*(кв|квартир|апартамент)/.test(assetText)) return 60;
  if (/24[\s-]*(кв|квартир|апартамент)/.test(assetText)) return 24;
  if (/12[\s-]*(кв|квартир|апартамент)/.test(assetText)) return 12;
  if (/8[\s-]*(кв|квартир|plex|плекс)/.test(assetText)) return 8;
  if (/4[\s-]*(кв|квартир|plex|плекс)|4х-кварт/.test(assetText)) return 4;
  if (/2[\s-]*(кв|квартир|plex|плекс)|duplex|дуплекс|двух-кварт/.test(assetText)) return 2;
  return 1;
}

export function marketSalePriceForUnits(basePrice: bigint, assetText: string) {
  return basePrice * BigInt(marketAssetUnits(assetText));
}

export type MarketAssetTarget =
  | "land10"
  | "land20"
  | "gold_coin"
  | "house2u"
  | "house3m"
  | "plex"
  | "apartment"
  | "carwash"
  | "kebab"
  | "zirconium"
  | "software"
  | "beauty_salon"
  | "boarding_house"
  | "shopping_center"
  | "auto_accessories"
  | "partnership";

export type MarketRule =
  | {
      action: "sale";
      target: MarketAssetTarget;
      scope: "all" | "current";
      pricing:
        | { type: "fixed"; priceCents: number }
        | { type: "per_unit"; priceCents: number; minimumUnits?: number }
        | { type: "down_payment_multiplier"; multiplier: number }
        | { type: "cost_plus"; amountCents: number }
        | { type: "no_cash_note"; cashflowChangeCents: number };
    }
  | {
      action: "business_cashflow";
      scope: "all";
      amountCents: number;
    }
  | {
      action: "surrender";
      target: "house3m";
      scope: "current";
    };

const fixedSale = (
  target: MarketAssetTarget,
  priceCents: number,
  scope: "all" | "current" = "all"
): MarketRule => ({
  action: "sale",
  target,
  scope,
  pricing: { type: "fixed", priceCents }
});

const perUnitSale = (
  target: "plex" | "apartment",
  priceCents: number,
  minimumUnits?: number
): MarketRule => ({
  action: "sale",
  target,
  scope: "all",
  pricing: { type: "per_unit", priceCents, ...(minimumUnits ? { minimumUnits } : {}) }
});

/**
 * Stable rules for the original Russian market deck. Keeping these rules keyed
 * by slug makes gameplay independent from punctuation and OCR wording while
 * still allowing custom card sets to use the legacy text fallback.
 */
export const originalMarketRules: Readonly<Record<string, MarketRule>> = {
  "market_0145_10-гектаров-земли": fixedSale("land10", 150000),
  "market_0146_20-гектаров-земли": fixedSale("land20", 200000),
  "market_0147_редкая-золотая-монета": fixedSale("gold_coin", 5000),
  "market_0148_салон-красоты-кофе-в-кроватку": fixedSale("beauty_salon", 250000),
  "market_0149_автомойка": fixedSale("carwash", 250000),
  "market_0150_розничная-сеть-по-продаже-шашлыков": fixedSale("kebab", 100000),
  "market_0151_партнерство": {
    action: "sale",
    target: "partnership",
    scope: "all",
    pricing: { type: "down_payment_multiplier", multiplier: 2 }
  },
  "market_0152_партнерство": {
    action: "sale",
    target: "partnership",
    scope: "all",
    pricing: { type: "down_payment_multiplier", multiplier: 2 }
  },
  "market_0153_партнерство": {
    action: "sale",
    target: "partnership",
    scope: "all",
    pricing: { type: "down_payment_multiplier", multiplier: 3 }
  },
  "market_0154_золото-дорожает": fixedSale("gold_coin", 600),
  "market_0155_циркониевые-браслеты-инженеринвестор": fixedSale("zirconium", 50000),
  "market_0156_программное-обеспечение": fixedSale("software", 100000),
  "market_0157_расширение-малого-бизнеса": {
    action: "business_cashflow",
    scope: "all",
    amountCents: 400
  },
  "market_0158_расширение-малого-бизнеса": {
    action: "business_cashflow",
    scope: "all",
    amountCents: 250
  },
  "market_0159_дело": {
    action: "sale",
    target: "house3m",
    scope: "current",
    pricing: { type: "cost_plus", amountCents: 50000 }
  },
  "market_0160_инфляция": { action: "surrender", target: "house3m", scope: "current" },
  "market_0161_вы-покупатель-дома-2у": fixedSale("house2u", 55000),
  "market_0162_покупатель-2у": fixedSale("house2u", 45000),
  "market_0163_покупатель-2у": fixedSale("house2u", 55000),
  "market_0164_покупатель-2у": fixedSale("house2u", 65000),
  "market_0165_покупатель-3m": fixedSale("house3m", 65000),
  "market_0166_покупатель-3m": fixedSale("house3m", 110000),
  "market_0167_покупатель-3m": fixedSale("house3m", 100000),
  "market_0168_покупатель-3m": fixedSale("house3m", 100000),
  "market_0169_покупатель-3m": fixedSale("house3m", 135000),
  "market_0170_покупатель-3m": fixedSale("house3m", 135000),
  "market_0171_покупатель-3m": fixedSale("house3m", 90000),
  "market_0172_покупатель-3m": {
    action: "sale",
    target: "house3m",
    scope: "current",
    pricing: { type: "no_cash_note", cashflowChangeCents: -500 }
  },
  "market_0173_покупатель-plex": perUnitSale("plex", 25000),
  "market_0174_покупатель-plex": perUnitSale("plex", 30000),
  "market_0175_пока-вы-не-наскребете-100000": perUnitSale("plex", 40000),
  "market_0176_покупатель-plex": perUnitSale("plex", 35000),
  "market_0177_покупатель-plex": perUnitSale("plex", 30000),
  "market_0178_покупатель-plex": perUnitSale("plex", 25000),
  "market_0179_покупатель-plex": perUnitSale("plex", 30000),
  "market_0180_покупатель-plex": perUnitSale("plex", 35000),
  "market_0181_покупатель-plex": perUnitSale("plex", 35000),
  "market_0182_покупатель-plex": perUnitSale("plex", 40000),
  "market_0183_покупатель-апартаменты": perUnitSale("apartment", 30000),
  "market_0184_покупатель-апартаменты": perUnitSale("apartment", 40000),
  "market_0185_покупатель-апартаменты": perUnitSale("apartment", 25000),
  "market_0186_покупатель-апартаменты": perUnitSale("apartment", 45000),
  "market_0187_покупатель-plex": perUnitSale("plex", 30000),
  "market_0188_покупатель-2у": fixedSale("house2u", 55000),
  "market_0189_покупатель-3m": fixedSale("house3m", 65000)
};

/** Stable rules for the newly recognized physical Russian market sheets. */
export const recognizedOriginalMarketRules: Readonly<Record<string, MarketRule>> = {
  market_1_r1c1: {
    action: "sale", target: "partnership", scope: "all",
    pricing: { type: "down_payment_multiplier", multiplier: 3 }
  },
  market_1_r1c2: { action: "business_cashflow", scope: "all", amountCents: 400 },
  market_1_r1c3: perUnitSale("plex", 35000),
  market_1_r2c1: fixedSale("boarding_house", 250000),
  market_1_r2c2: perUnitSale("plex", 25000),
  market_1_r2c3: {
    action: "sale", target: "partnership", scope: "all",
    pricing: { type: "down_payment_multiplier", multiplier: 2 }
  },
  market_1_r3c1: fixedSale("software", 100000),
  market_1_r3c2: perUnitSale("plex", 35000),
  market_1_r3c3: fixedSale("house2u", 45000),
  market_1_r4c1: {
    action: "sale", target: "partnership", scope: "all",
    pricing: { type: "down_payment_multiplier", multiplier: 2 }
  },
  market_1_r4c2: fixedSale("house3m", 135000),
  market_1_r4c3: fixedSale("house2u", 65000),
  market_1_r5c1: perUnitSale("plex", 40000),
  market_1_r5c2: perUnitSale("plex", 35000),
  market_1_r5c3: fixedSale("land10", 150000),
  market_1_r6c1: fixedSale("house2u", 55000),
  market_1_r6c2: fixedSale("gold_coin", 600),
  market_1_r6c3: {
    action: "sale", target: "house3m", scope: "current",
    pricing: { type: "cost_plus", amountCents: 50000 }
  },
  market_2_r1c1: fixedSale("house3m", 135000),
  market_2_r1c2: fixedSale("carwash", 250000),
  market_2_r1c3: fixedSale("house3m", 65000),
  market_2_r2c1: fixedSale("gold_coin", 5000),
  market_2_r2c2: fixedSale("auto_accessories", 50000),
  market_2_r2c3: perUnitSale("plex", 30000),
  market_2_r3c1: perUnitSale("plex", 25000),
  market_2_r3c2: perUnitSale("plex", 30000),
  market_2_r3c3: fixedSale("house3m", 90000),
  market_2_r4c1: fixedSale("house3m", 110000),
  market_2_r4c2: { action: "surrender", target: "house3m", scope: "current" },
  market_2_r4c3: perUnitSale("plex", 40000),
  market_2_r5c1: perUnitSale("plex", 45000),
  market_2_r5c2: fixedSale("house3m", 100000),
  market_2_r5c3: fixedSale("shopping_center", 100000),
  market_2_r6c1: perUnitSale("apartment", 30000, 13),
  market_2_r6c2: fixedSale("house2u", 55000),
  market_2_r6c3: perUnitSale("plex", 25000),
  market_3_r1c1: {
    action: "sale", target: "house3m", scope: "current",
    pricing: { type: "no_cash_note", cashflowChangeCents: -500 }
  },
  market_3_r2c1: { action: "business_cashflow", scope: "all", amountCents: 250 },
  market_3_r3c1: fixedSale("land20", 200000),
  market_3_r4c1: perUnitSale("plex", 40000),
  market_3_r5c1: fixedSale("house3m", 100000),
  market_3_r6c1: perUnitSale("plex", 30000)
};

export function originalMarketRule(slug: string) {
  const existing = originalMarketRules[slug];
  if (existing) return existing;
  const source = slug.match(/^original_ru_market_(market_[123]_r\d+c\d+)_/)?.[1];
  return source ? recognizedOriginalMarketRules[source] ?? null : null;
}

export function marketAssetMatchesTarget(target: MarketAssetTarget, assetText: string) {
  const normalized = assetText.toLowerCase().replace(/ё/g, "е");
  if (target === "land10") return /(?:^|\s)10\s*(?:га|гектар)/.test(normalized);
  if (target === "land20") return /(?:^|\s)20\s*(?:га|гектар)/.test(normalized);
  if (target === "gold_coin") return normalized.includes("золот") && normalized.includes("монет");
  if (target === "house2u") return /\b2у\b|2\/1|2\s*спальн/.test(normalized);
  if (target === "house3m") return /\b3m\b|\b3м\b|3\/2|3br/.test(normalized);
  if (target === "plex") return /duplex|дуплекс|plex|плекс|[248][\s-]*(кв|квартир)/.test(normalized);
  if (target === "apartment") return normalized.includes("апартамент");
  if (target === "carwash") return normalized.includes("автомой");
  if (target === "kebab") return normalized.includes("шашлык");
  if (target === "zirconium") return normalized.includes("циркони");
  if (target === "software") return normalized.includes("программ");
  if (target === "beauty_salon") {
    return normalized.includes("салон") && normalized.includes("крас");
  }
  if (target === "boarding_house") return /пансион|ночлег.*завтрак/.test(normalized);
  if (target === "shopping_center") return normalized.includes("торгов") && normalized.includes("пассаж");
  if (target === "auto_accessories") return normalized.includes("автомобильн") && normalized.includes("наворот");
  return normalized.includes("партнерств");
}

export function marketRuleSalePriceCents(
  rule: Extract<MarketRule, { action: "sale" }>,
  asset: { downPaymentCents: bigint; costBasisCents: bigint },
  assetText: string
) {
  if (rule.pricing.type === "fixed") return BigInt(rule.pricing.priceCents);
  if (rule.pricing.type === "per_unit") {
    const units = marketAssetUnits(assetText);
    if (rule.pricing.minimumUnits && units < rule.pricing.minimumUnits) return 0n;
    return BigInt(rule.pricing.priceCents) * BigInt(units);
  }
  if (rule.pricing.type === "down_payment_multiplier") {
    return asset.downPaymentCents * BigInt(rule.pricing.multiplier);
  }
  if (rule.pricing.type === "cost_plus") {
    return asset.costBasisCents + BigInt(rule.pricing.amountCents);
  }
  return 0n;
}

export function isRentalRealEstateAsset(assetText: string) {
  const normalized = assetText.toLowerCase().replace(/ё/g, "е");
  if (
    /part\s*time|брат\s+просит|другу\s+срочно|монет|гектар|свободная\s+земл|циркониев/.test(normalized)
  ) {
    return false;
  }

  return /(?:^|\s)(?:2у|3m|3м)(?:\s|$)|plex|duplex|коттедж|таунхаус|апартамент|квартирн(?:ый|ого)\s+(?:дом|комплекс)|дом:\s*\$/.test(
    normalized
  );
}
