import { assetPortion202, finances202, type Asset202, type Offer202, type Player202, type Public202, type Task202 } from "@cashflow/shared";
import { loanLimit202 } from "./game-202-actions";

export type DecisionQuantity202 = number | "";
export type QuantityRules202 = { min: number; step: number; max: number };

const cents = (dollars: number) => Math.round(dollars * 100);
const fixedQuantity: QuantityRules202 = { min: 1, step: 1, max: 1 };

/** These are command limits; the affordability limit is calculated separately. */
export function quantityRules202(task: Task202, operation: "buy" | "sell" | "short" = "buy", player?: Player202): QuantityRules202 {
  if (operation === "short" || task.rule?.kind === "option") return { min: 100, step: 100, max: 5000 };
  if (task.kind === "quote") {
    return { min: 1, step: 1, max: operation === "sell"
      ? player?.stocks.filter(stock => stock.symbol === task.symbol).reduce((sum, stock) => sum + stock.quantity, 0) ?? 0
      : 1000000 };
  }
  if (task.rule?.kind === "investment" && task.rule.repeat) return { min: 1, step: 1, max: 100000 };
  return { ...fixedQuantity };
}

function validQuantity(quantity: DecisionQuantity202, rules: QuantityRules202): quantity is number {
  return typeof quantity === "number" && Number.isSafeInteger(quantity)
    && quantity >= rules.min && quantity <= rules.max && quantity % rules.step === 0;
}

function quantityReason(rules: QuantityRules202) {
  if (rules.max < rules.min) return "Нет доступного количества для этой операции.";
  return rules.step > 1
    ? `Укажите количество от ${rules.min} до ${rules.max}, кратное ${rules.step}.`
    : rules.max === 1 ? "Можно приобрести один актив." : `Укажите целое количество от ${rules.min} до ${rules.max}.`;
}

function actorReason(state: Public202, player: Player202, task: Task202) {
  if (state.queue[0]?.id !== task.id) return "Это решение уже недоступно.";
  if (task.playerId !== player.id) return "Ожидаем решения другого участника.";
  return null;
}

export function exchangeAssets202(state: Public202, player: Player202, task: Task202) {
  const rule = task.rule;
  if (rule?.kind !== "exchange") return [];
  return state.assets.filter(asset => asset.kind === "property" && (asset.owners[player.id] ?? 0) > 0
    && asset.units === rule.units && (rule.units !== 1 || asset.house));
}

function assetLocked(state: Public202, asset: Asset202) {
  return Object.entries(asset.owners).some(([id, share]) => share > 0
    && (asset.lockedUntil[id] ?? 0) > (state.players.find(player => player.id === id)?.laps ?? 0));
}

export type PurchaseDecision202 = {
  kind: "stock" | "option" | "property" | "right" | "d2y" | "investment" | "exchange";
  isStock: boolean;
  quantityEditable: boolean;
  quantityRules: QuantityRules202;
  quantityValid: boolean;
  maxAffordableQuantity: number;
  unitPriceCents: number;
  priceCents: number;
  downPaymentCents: number;
  assetDownPaymentCents: number;
  mortgageCents: number;
  paymentCents: number;
  cashflowCents: number;
  netCashflowChangeCents: number;
  repairLoanCents: number;
  repairPaymentCents: number;
  canBuy: boolean;
  reason: string | null;
  canTakeLoan: boolean;
};

/** All output amounts are canonical cents; no legacy database financial projection is read. */
export function decisionPurchase202(state: Public202, player: Player202, task: Task202, quantity: DecisionQuantity202 = 1, assetId = ""): PurchaseDecision202 | null {
  // A priority decision only transfers a right. It does not buy the underlying property yet.
  if (task.kind !== "deal" && task.kind !== "quote") return null;
  const rules = quantityRules202(task);
  const quantityValid = validQuantity(quantity, rules);
  const count = quantityValid ? quantity : 0;
  let kind: PurchaseDecision202["kind"];
  let unitPrice = 0, price = 0, downPayment = 0, assetDownPayment = 0, mortgage = 0;
  let cashflow = 0, netCashflowChange = 0, repairLoan = 0;
  let reason = actorReason(state, player, task);
  let needsCashCheck = true;

  if (task.kind === "quote") {
    kind = "stock";
    unitPrice = price = task.price ?? 0;
    if (!task.buy) reason ??= "Покупка по этой котировке недоступна.";
    if (task.traded?.includes("buy")) reason ??= "Акции по этой котировке уже куплены.";
  } else {
    const rule = task.rule;
    if (!rule) return null;
    switch (rule.kind) {
      case "property":
      case "market_property": {
        kind = "property";
        const property = rule.kind === "property" ? rule : rule.property;
        unitPrice = downPayment = cents(property.fee ?? property.down);
        assetDownPayment = cents(property.down);
        price = cents(property.cost);
        mortgage = cents(property.mortgage);
        cashflow = cents(property.income);
        if (rule.kind === "market_property") repairLoan = cents(rule.repair);
        if (repairLoan && player.bankrupt) reason ??= "После банкротства кредит на ремонт инвестиционного объекта недоступен.";
        break;
      }
      case "option":
        kind = "option";
        unitPrice = price = cents(rule.premium);
        break;
      case "right":
        kind = "right";
        unitPrice = price = downPayment = cents(rule.cost);
        break;
      case "investment":
        kind = "investment";
        unitPrice = price = cents(rule.cost);
        downPayment = rule.repeat ? 0 : unitPrice;
        cashflow = cents(rule.income) * count;
        break;
      case "d2y": {
        kind = "d2y";
        unitPrice = price = downPayment = rule.level === 1 ? cents(200) : 0;
        needsCashCheck = rule.level === 1;
        if (rule.level !== 2 && player.d2y.some(level => level.level === rule.level)) reason ??= "Этот уровень D2Y уже есть.";
        const after = { ...player, d2y: [...player.d2y, { level: rule.level, income: cents(rule.income) }] };
        cashflow = finances202(state, after).cashflow - finances202(state, player).cashflow;
        break;
      }
      case "exchange": {
        kind = "exchange";
        needsCashCheck = false;
        const asset = exchangeAssets202(state, player, task).find(candidate => candidate.id === assetId);
        if (!asset) reason ??= "Выберите подходящий объект для обмена.";
        else if (assetLocked(state, asset)) reason ??= "Продажа выбранного объекта временно запрещена.";
        if (asset) {
          const replacement = { ...asset, income: cents(rule.property.income) };
          cashflow = assetPortion202(replacement, player.id, replacement.income) - assetPortion202(asset, player.id, asset.income);
        }
        break;
      }
      default: return null;
    }
  }
  if (!quantityValid) reason ??= quantityReason(rules);
  const payment = unitPrice * count;
  if (!Number.isSafeInteger(payment)) reason ??= "Сумма покупки слишком велика.";
  if (needsCashCheck && player.cash < payment) reason ??= "Недостаточно наличных для покупки.";
  const repairPayment = Math.round(repairLoan / 10);
  netCashflowChange = cashflow - repairPayment;
  const affordable = unitPrice > 0 ? Math.floor(Math.max(0, player.cash) / unitPrice / rules.step) * rules.step : rules.max;
  const maxAffordable = Math.min(rules.max, affordable);
  return {
    kind, isStock: rules.max > 1, quantityEditable: rules.max > 1, quantityRules: rules, quantityValid,
    maxAffordableQuantity: maxAffordable >= rules.min ? maxAffordable : 0,
    unitPriceCents: unitPrice, priceCents: price, downPaymentCents: downPayment,
    assetDownPaymentCents: assetDownPayment, mortgageCents: mortgage, paymentCents: payment,
    cashflowCents: cashflow, netCashflowChangeCents: netCashflowChange,
    repairLoanCents: repairLoan, repairPaymentCents: repairPayment,
    canBuy: reason === null, reason,
    canTakeLoan: loanLimit202(state, player, finances202(state, player).cashflow) >= 1000
  };
}

export function decisionShort202(state: Public202, player: Player202, task: Task202, quantity: DecisionQuantity202) {
  const rules = quantityRules202(task, "short", player);
  const quantityValid = validQuantity(quantity, rules);
  let reason = actorReason(state, player, task);
  if (task.kind !== "quote" || !task.buy || player.cash < 0) reason ??= "Короткая продажа по этой котировке недоступна.";
  if (task.traded?.includes("short")) reason ??= "Короткая позиция по этой котировке уже открыта.";
  if (!quantityValid) reason ??= quantityReason(rules);
  return {
    quantityRules: rules, quantityValid, unitPriceCents: task.price ?? 0,
    paymentCents: 0, proceedsHeldCents: quantityValid ? (task.price ?? 0) * quantity : 0,
    canOpen: reason === null, reason
  };
}

/** Same joint-payment rounding as acceptOffer: the proposer owns the cent remainder. */
export function offerPayment202(offer: Offer202, playerId: string): number | null {
  if (offer.kind !== "joint") return offer.to === playerId ? offer.price : null;
  if (!offer.shares?.[playerId]) return null;
  const ownPayment = Math.round(offer.price * offer.shares[playerId]! / 10000);
  if (playerId !== offer.from) return ownPayment;
  const allocated = Object.values(offer.shares).reduce((sum, share) => sum + Math.round(offer.price * share / 10000), 0);
  return ownPayment + offer.price - allocated;
}

export type SaleDecision202 = {
  kind: "sale" | "exchange" | "foreclosure";
  assetName: string;
  share: number;
  salePriceCents: number;
  mortgageCents: number;
  proceedsCents: number;
  netCashflowChangeCents: number;
  roundingAdjustmentCents: number;
  requiredPaymentCents: number;
  canAfford: boolean;
  canAccept: boolean;
  reason: string | null;
  needsAllOwners: boolean;
  approvedOwnerIds: string[];
  pendingOwnerIds: string[];
  remainingAcres: number;
  replacementCostCents: number;
  replacementMortgageCents: number;
  replacementCashflowCents: number;
};

/** Preview this owner's actual settlement. In 202 an uncovered sale may create a mandatory debt. */
export function decisionSale202(state: Public202, player: Player202, task: Task202): SaleDecision202 | null {
  if (task.kind !== "sale" && task.kind !== "exchange") return null;
  const asset = state.assets.find(candidate => candidate.id === task.assetId);
  const rule = task.rule;
  if (!asset || !rule || !["sale", "exchange", "rent"].includes(rule.kind)) return null;
  const owners = Object.keys(asset.owners).filter(id => asset.owners[id]! > 0);
  const approvedOwnerIds = owners.filter(id => task.approved?.includes(id));
  const pendingOwnerIds = owners.filter(id => !approvedOwnerIds.includes(id));
  let reason = actorReason(state, player, task);
  if (!owners.includes(player.id)) reason ??= "У вас нет доли в этом объекте.";
  if (approvedOwnerIds.includes(player.id)) reason ??= "Ваше согласие уже принято.";
  if (assetLocked(state, asset)) reason ??= "Продажа объекта временно запрещена.";
  let kind: SaleDecision202["kind"] = "sale";
  let salePrice = 0, mortgage = 0, proceeds = 0, remainingAcres = 0;
  let replacementCost = 0, replacementMortgage = 0, replacementCashflow = 0;
  if (rule.kind === "exchange") {
    kind = "exchange";
    replacementCost = assetPortion202(asset, player.id, cents(rule.property.cost));
    replacementMortgage = assetPortion202(asset, player.id, cents(rule.property.mortgage));
    replacementCashflow = assetPortion202(asset, player.id, cents(rule.property.income));
  } else if (rule.kind === "rent") {
    kind = "foreclosure";
    salePrice = proceeds = assetPortion202(asset, player.id, Math.floor(asset.down / 2));
  } else if (rule.kind === "sale") {
    const totalPrice = rule.filter === "highest" ? Math.round(asset.cost * rule.price)
      : rule.filter === "house" || rule.filter === "land" ? cents(rule.price) : cents(rule.price) * asset.units;
    salePrice = assetPortion202(asset, player.id, totalPrice);
    mortgage = assetPortion202(asset, player.id, asset.mortgage);
    proceeds = assetPortion202(asset, player.id, totalPrice - asset.mortgage);
    if (rule.filter === "land") remainingAcres = Math.max(0, asset.acres - (rule.acres ?? 0));
  }
  return {
    kind, assetName: asset.name, share: asset.owners[player.id] ?? 0,
    salePriceCents: salePrice, mortgageCents: mortgage, proceedsCents: proceeds,
    netCashflowChangeCents: replacementCashflow - assetPortion202(asset, player.id, asset.income),
    roundingAdjustmentCents: proceeds - (salePrice - mortgage),
    requiredPaymentCents: Math.max(0, -proceeds), canAfford: player.cash + proceeds >= 0,
    canAccept: reason === null, reason, needsAllOwners: owners.length > 1, approvedOwnerIds, pendingOwnerIds,
    remainingAcres, replacementCostCents: replacementCost, replacementMortgageCents: replacementMortgage,
    replacementCashflowCents: replacementCashflow
  };
}
