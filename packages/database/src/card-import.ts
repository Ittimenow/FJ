export const importCardTypes = [
  "SMALL_DEAL",
  "BIG_DEAL",
  "MARKET",
  "DOODAD",
  "FAST_TRACK",
  "DREAM"
] as const;

export const importEffectTypes = [
  "cash.adjust",
  "cashflow.adjust",
  "liability.create",
  "asset.quantity.multiply",
  "asset.quantity.divide",
  "asset.wipeout"
] as const;

export const importConditionTypes = [
  "has_children",
  "has_rental_realestate",
  "has_8_plex"
] as const;

export const importMetaKeys = [
  "symbol",
  "today_price",
  "price",
  "price_min",
  "price_max",
  "down_payment",
  "mortgage",
  "cashflow_monthly",
  "per_child",
  "liability_added",
  "payment_choice",
  "cash_price",
  "credit_balance",
  "credit_payment"
] as const;

export type ImportCardType = (typeof importCardTypes)[number];
export type ImportEffectType = (typeof importEffectTypes)[number];
export type ImportConditionType = (typeof importConditionTypes)[number];

export interface ImportCardMeta {
  metaKey: string;
  metaValue: string;
}

export interface ImportCardEffect {
  effectType: string;
  amountCents: number | null;
  payload: Record<string, unknown>;
}

export interface ImportCardCondition {
  condType: string;
  payload: Record<string, unknown>;
}

export interface ImportCard {
  cardType: ImportCardType;
  slug: string;
  title: string;
  bodyText: string;
  category: string | null;
  subcategory: string | null;
  isActive: boolean;
  meta: ImportCardMeta[];
  effects: ImportCardEffect[];
  conditions: ImportCardCondition[];
}

export interface CardValidationError {
  index: number;
  slug: string | null;
  message: string;
}

export interface CardValidationResult {
  cards: ImportCard[];
  errors: CardValidationError[];
}

const cardTypeSet = new Set<string>(importCardTypes);
const effectTypeSet = new Set<string>(importEffectTypes);
const conditionTypeSet = new Set<string>(importConditionTypes);
const metaKeySet = new Set<string>(importMetaKeys);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : null;
}

function optionalText(value: unknown) {
  if (value === null || value === undefined) return null;
  return text(value);
}

function integer(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function numericMeta(meta: Map<string, string>, key: string) {
  const value = meta.get(key);
  if (value === undefined) return null;
  if (!/^-?\d+$/.test(value)) return Number.NaN;
  return Number(value);
}

function normalizePayload(value: unknown) {
  return isRecord(value) ? value : {};
}

export function validateCardBatch(input: unknown): CardValidationResult {
  if (!Array.isArray(input)) {
    return {
      cards: [],
      errors: [{ index: -1, slug: null, message: "Корень JSON должен быть массивом карточек" }]
    };
  }

  const cards: ImportCard[] = [];
  const errors: CardValidationError[] = [];
  const slugs = new Set<string>();
  const addError = (index: number, slug: string | null, message: string) => {
    errors.push({ index, slug, message });
  };

  for (const [index, raw] of input.entries()) {
    if (!isRecord(raw)) {
      addError(index, null, "Карточка должна быть объектом");
      continue;
    }
    const slug = text(raw.slug);
    const title = text(raw.title);
    const bodyText = text(raw.bodyText);
    const cardType = text(raw.cardType);
    const category = optionalText(raw.category);
    const subcategory = optionalText(raw.subcategory);
    const displaySlug = slug ?? null;

    if (!cardType || !cardTypeSet.has(cardType)) addError(index, displaySlug, `Недопустимый cardType: ${String(raw.cardType)}`);
    if (!slug) addError(index, displaySlug, "slug обязателен");
    if (slug && (slug.length > 160 || !/^[a-z0-9а-яё_-]+$/u.test(slug))) addError(index, displaySlug, "slug должен быть в нижнем регистре, без пробелов, не длиннее 160 символов");
    if (slug && slugs.has(slug)) addError(index, displaySlug, "slug повторяется во входном наборе");
    if (slug) slugs.add(slug);
    if (!title) addError(index, displaySlug, "title обязателен");
    if (title && title.length > 240) addError(index, displaySlug, "title длиннее 240 символов");
    if (!bodyText) addError(index, displaySlug, "bodyText обязателен");
    if (bodyText && bodyText.length > 4000) addError(index, displaySlug, "bodyText длиннее 4000 символов");
    if (category && category.length > 160) addError(index, displaySlug, "category длиннее 160 символов");
    if (subcategory && subcategory.length > 160) addError(index, displaySlug, "subcategory длиннее 160 символов");
    if (typeof raw.isActive !== "boolean") addError(index, displaySlug, "isActive должен быть boolean");

    const rawMeta = Array.isArray(raw.meta) ? raw.meta : [];
    const rawEffects = Array.isArray(raw.effects) ? raw.effects : [];
    const rawConditions = Array.isArray(raw.conditions) ? raw.conditions : [];
    if (!Array.isArray(raw.meta)) addError(index, displaySlug, "meta должен быть массивом");
    if (!Array.isArray(raw.effects)) addError(index, displaySlug, "effects должен быть массивом");
    if (!Array.isArray(raw.conditions)) addError(index, displaySlug, "conditions должен быть массивом");

    const normalizedMeta: ImportCardMeta[] = [];
    const metaValues = new Map<string, string>();
    for (const row of rawMeta) {
      if (!isRecord(row)) {
        addError(index, displaySlug, "Каждая запись meta должна быть объектом");
        continue;
      }
      const metaKey = text(row.metaKey);
      const metaValue = text(row.metaValue);
      if (!metaKey || !metaValue) {
        addError(index, displaySlug, "metaKey и metaValue обязательны");
        continue;
      }
      if (!metaKeySet.has(metaKey)) addError(index, displaySlug, `Неподдерживаемый metaKey: ${metaKey}`);
      if (metaKey.length > 120 || metaValue.length > 2000) addError(index, displaySlug, `Слишком длинное meta: ${metaKey}`);
      if (metaValues.has(metaKey)) addError(index, displaySlug, `Повторяющийся metaKey: ${metaKey}`);
      metaValues.set(metaKey, metaValue);
      normalizedMeta.push({ metaKey, metaValue });
    }

    const normalizedEffects: ImportCardEffect[] = [];
    for (const row of rawEffects) {
      if (!isRecord(row)) {
        addError(index, displaySlug, "Каждый effect должен быть объектом");
        continue;
      }
      const effectType = text(row.effectType);
      const amountCents = row.amountCents === null ? null : row.amountCents;
      if (!effectType || !effectTypeSet.has(effectType)) addError(index, displaySlug, `Неподдерживаемый effectType: ${String(row.effectType)}`);
      if (amountCents !== null && !integer(amountCents)) addError(index, displaySlug, `amountCents должен быть безопасным целым числом: ${String(amountCents)}`);
      if (!isRecord(row.payload)) addError(index, displaySlug, `payload эффекта ${String(effectType)} должен быть объектом`);
      if (effectType) normalizedEffects.push({ effectType, amountCents: integer(amountCents) ? amountCents : null, payload: normalizePayload(row.payload) });
    }

    const normalizedConditions: ImportCardCondition[] = [];
    for (const row of rawConditions) {
      if (!isRecord(row)) {
        addError(index, displaySlug, "Каждое condition должно быть объектом");
        continue;
      }
      const condType = text(row.condType);
      if (!condType || !conditionTypeSet.has(condType)) addError(index, displaySlug, `Неподдерживаемый condType: ${String(row.condType)}`);
      if (!isRecord(row.payload)) addError(index, displaySlug, `payload условия ${String(condType)} должен быть объектом`);
      if (condType) normalizedConditions.push({ condType, payload: normalizePayload(row.payload) });
    }

    const symbol = metaValues.get("symbol");
    if (normalizedEffects.some((effect) => effect.effectType.startsWith("asset.")) && !symbol) addError(index, displaySlug, "Операция с количеством акций требует meta.symbol");
    if (metaValues.has("per_child") && !normalizedConditions.some((condition) => condition.condType === "has_children")) addError(index, displaySlug, "meta.per_child требует условия has_children");
    if (metaValues.get("payment_choice") === "cash_or_credit") {
      for (const key of ["cash_price", "credit_balance", "credit_payment"]) {
        if (!metaValues.has(key)) addError(index, displaySlug, `payment_choice требует meta.${key}`);
      }
    }
    if (cardType === "DOODAD" && normalizedEffects.length === 0 && metaValues.get("payment_choice") !== "cash_or_credit") addError(index, displaySlug, "DOODAD должен иметь обязательный effect или поддерживаемый payment_choice");
    if (cardType === "DOODAD") {
      for (const effect of normalizedEffects) {
        if (effect.payload.mandatory !== true && effect.payload.required !== true) addError(index, displaySlug, `Эффект DOODAD ${effect.effectType} должен быть обязательным`);
      }
    }

    const price = numericMeta(metaValues, "price");
    const mortgage = numericMeta(metaValues, "mortgage");
    const downPayment = numericMeta(metaValues, "down_payment");
    for (const [key, value] of [["price", price], ["mortgage", mortgage], ["down_payment", downPayment]] as const) {
      if (Number.isNaN(value)) addError(index, displaySlug, `meta.${key} должен содержать целое число`);
    }
    if (price !== null && mortgage !== null && downPayment !== null && price !== mortgage + downPayment) addError(index, displaySlug, "price должен равняться mortgage + down_payment");
    if (symbol && metaValues.has("today_price") && metaValues.get("price") !== metaValues.get("today_price")) addError(index, displaySlug, "Для акции meta.price должен совпадать с meta.today_price");

    if (cardType && cardTypeSet.has(cardType) && slug && title && bodyText && typeof raw.isActive === "boolean") {
      cards.push({
        cardType: cardType as ImportCardType,
        slug,
        title,
        bodyText,
        category,
        subcategory,
        isActive: raw.isActive,
        meta: normalizedMeta,
        effects: normalizedEffects,
        conditions: normalizedConditions
      });
    }
  }

  return { cards, errors };
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function cardFingerprint(card: ImportCard) {
  return JSON.stringify(sortValue(card));
}

export function classifyCardChanges(incoming: ImportCard[], existing: ImportCard[]) {
  const existingBySlug = new Map(existing.map((card) => [card.slug, card]));
  const created: ImportCard[] = [];
  const updated: ImportCard[] = [];
  const unchanged: ImportCard[] = [];
  for (const card of incoming) {
    const current = existingBySlug.get(card.slug);
    if (!current) created.push(card);
    else if (cardFingerprint(current) === cardFingerprint(card)) unchanged.push(card);
    else updated.push(card);
  }
  return { created, updated, unchanged };
}
