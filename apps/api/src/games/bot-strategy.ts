import { availableBankLoanCents, bankLoanPaymentCents, fastTrackCells, fastTrackDreams } from "@cashflow/shared";

export const balancedBotStrategy = "balanced_v1";
export const botLevels = ["beginner_v1", "balanced_v1", "expert_v1"] as const;
export type BotLevel = typeof botLevels[number];

export function botLevel(value: string | null): BotLevel {
  return botLevels.includes(value as BotLevel) ? value as BotLevel : balancedBotStrategy;
}

const policies = {
  beginner_v1: { reserveMonths: 3, dealReserveShare: 0.6, maxPayback: 48, maxStockPrice: 5, stockShare: 0.05, loanPaymentShare: 0.25, bidMonths: 3, saleProfit: 1.35 },
  balanced_v1: { reserveMonths: 2, dealReserveShare: 0.35, maxPayback: 72, maxStockPrice: 10, stockShare: 0.15, loanPaymentShare: 0.5, bidMonths: 6, saleProfit: 1.2 },
  expert_v1: { reserveMonths: 1.5, dealReserveShare: 0.25, maxPayback: 96, maxStockPrice: 20, stockShare: 0.2, loanPaymentShare: 0.7, bidMonths: 10, saleProfit: 1.12 }
} as const;

export interface BotFinancialSnapshot {
  cashCents: number;
  totalIncomeCents: number;
  totalExpensesCents: number;
  monthlyCashflowCents: number;
  passiveIncomeCents?: number;
  bankLoanBalanceCents?: number;
}

export interface BotDealOffer {
  title: string;
  isStock: boolean;
  unitCostCents: number;
  cashflowCents: number;
  priceMinCents?: number;
  priceMaxCents?: number;
}

function diceWays(steps: number, count: number): number {
  let ways = [1];
  for (let die = 0; die < count; die += 1) {
    const next = Array(ways.length + 6).fill(0) as number[];
    ways.forEach((value, total) => {
      for (let face = 1; face <= 6; face += 1) next[total + face] = (next[total + face] ?? 0) + value;
    });
    ways = next;
  }
  return ways[steps] ?? 0;
}

export function firstTurnDreamProbability(cellIndex: number) {
  return diceWays(cellIndex + 1, 2) / 36;
}

export function chooseBotDream(level: BotLevel, randomIndex: (length: number) => number, occupied = new Set<number>()) {
  const candidates = fastTrackDreams.filter((dream) => !occupied.has(dream.index));
  const available = candidates.length > 0 ? candidates : fastTrackDreams;
  if (level !== "expert_v1") return available[randomIndex(available.length)]!.index;
  return [...available].sort((left, right) => {
    const leftScore = firstTurnDreamProbability(left.index) / left.cost;
    const rightScore = firstTurnDreamProbability(right.index) / right.cost;
    return rightScore - leftScore || left.cost - right.cost;
  })[0]!.index;
}

export function estimateBotEscapeCapital(totalExpensesCents: number, passiveIncomeCents: number, downPaymentCents: number, assetIncomeCents: number) {
  if (assetIncomeCents <= 0) return null;
  const neededIncomeCents = Math.max(0, totalExpensesCents + 1 - passiveIncomeCents);
  const assetCount = Math.ceil(neededIncomeCents / assetIncomeCents);
  return { neededIncomeCents, assetCount, capitalCents: assetCount * downPaymentCents };
}

export function shouldEnterBotFastTrack(state: BotFinancialSnapshot, dreamPriceCents: number, dreamCellIndex: number, level: BotLevel) {
  if (level !== "expert_v1") return true;
  const expectedCash = state.cashCents + (state.passiveIncomeCents ?? 0) * 100;
  const earlyDream = firstTurnDreamProbability(dreamCellIndex) >= 1 / 9;
  return expectedCash >= Math.max(earlyDream ? 0 : 200_000, dreamPriceCents + (earlyDream ? 10_000 : 25_000));
}

export function chooseBotFastTrackDice(position: number, dreamCellIndex: number | null, cashCents: number, charity: boolean, level: BotLevel) {
  if (!charity || level !== "expert_v1") return 2;
  let bestCount = 2;
  let bestScore = -Infinity;
  for (const count of [1, 2, 3]) {
    let score = 0;
    for (let steps = count; steps <= count * 6; steps += 1) {
      const probability = diceWays(steps, count) / 6 ** count;
      const cell = fastTrackCells[(position + steps) % fastTrackCells.length]!;
      if (cell.index === dreamCellIndex && cashCents >= cell.cost) score += probability * 1_000;
      else if (cell.rule.kind === "business" && cashCents >= cell.cost) score += probability * Math.min(80, cell.income / 300);
      else if (cell.rule.kind === "chance_business" && cashCents >= cell.cost) score += probability * Math.min(80, cell.income / 300) * (7 - cell.rule.minimum) / 6;
      else if (cell.rule.kind === "ipo" && cashCents >= cell.cost) score += probability * (cell.rule.payout / 10_000) * (7 - cell.rule.minimum) / 6;
      else if (cell.rule.kind === "cashflow") score += probability * 8;
      else if (cell.rule.kind === "half_cash" || cell.rule.kind === "lose_cash") score -= probability * 10;
    }
    if (score > bestScore) { bestScore = score; bestCount = count; }
  }
  return bestCount;
}

export interface BotDealDecision {
  buy: boolean;
  quantity: number;
  loanAmountCents: number;
  reason: string;
}

export function decideBotAuctionBid(
  state: BotFinancialSnapshot,
  deal: { downPaymentCents: number; cashflowCents: number },
  level: BotLevel = balancedBotStrategy
) {
  const availableForBid =
    state.cashCents - botCashReserve(state, level) - Math.max(0, deal.downPaymentCents);
  if (availableForBid < 100 || deal.cashflowCents <= 0) {
    return {
      amountCents: null,
      reason: "после покупки не останется безопасного резерва наличных"
    };
  }

  const valueBasedBid = Math.max(500, deal.cashflowCents * policies[level].bidMonths);
  const amountCents = Math.floor(Math.min(availableForBid, valueBasedBid) / 100) * 100;
  return amountCents >= 100
    ? {
        amountCents,
        reason: "цена возможности сохраняет резерв и соответствует доходу сделки"
      }
    : {
        amountCents: null,
        reason: "для безопасной ставки недостаточно свободных наличных"
      };
}

export function botCashReserve(state: BotFinancialSnapshot, level: BotLevel = balancedBotStrategy) {
  return Math.max(
    1_000,
    state.totalExpensesCents * policies[level].reserveMonths,
    Math.abs(Math.min(0, state.monthlyCashflowCents)) * 3
  );
}

export function botDealReserve(state: BotFinancialSnapshot, level: BotLevel = balancedBotStrategy) {
  return Math.max(
    1_000,
    Math.ceil(state.totalExpensesCents * policies[level].dealReserveShare),
    Math.abs(Math.min(0, state.monthlyCashflowCents)) * 2
  );
}

export function chooseBotDealType(state: BotFinancialSnapshot, level: BotLevel = balancedBotStrategy) {
  const available = state.cashCents - botDealReserve(state, level);
  return available >= Math.max(8_000, state.totalExpensesCents * 1.5)
    ? "BIG_DEAL"
    : "SMALL_DEAL";
}

export function decideBotDeal(
  state: BotFinancialSnapshot,
  offer: BotDealOffer,
  level: BotLevel = balancedBotStrategy
): BotDealDecision {
  const unitCost = Math.round(offer.unitCostCents);

  if (!Number.isFinite(unitCost) || unitCost < 0 || (offer.isStock && unitCost === 0)) {
    return {
      buy: false,
      quantity: 1,
      loanAmountCents: 0,
      reason: "в карточке не удалось определить цену покупки"
    };
  }

  if (offer.isStock) {
    const available = Math.max(0, state.cashCents - botCashReserve(state, level));
    const low = offer.priceMinCents && offer.priceMinCents > 0 ? offer.priceMinCents : unitCost;
    const high = offer.priceMaxCents && offer.priceMaxCents > 0 ? offer.priceMaxCents : unitCost;
    const bargain = level === "expert_v1" && unitCost <= Math.max(2, low * 1.2) && high >= unitCost * 3;
    const upside = high / unitCost;
    const rangePosition = high > low ? Math.max(0, Math.min(1, (unitCost - low) / (high - low))) : 1;
    const share = level === "expert_v1"
      ? bargain ? 1 : high <= low ? policies[level].stockShare : upside >= 1.5 ? 0.2 + (1 - rangePosition) * 0.45 : 0
      : policies[level].stockShare;
    const loanAmount = bargain && !state.bankLoanBalanceCents && state.monthlyCashflowCents >= 200 && available < state.monthlyCashflowCents * 4
      ? Math.floor(Math.min(availableBankLoanCents(state.monthlyCashflowCents) / 2, state.monthlyCashflowCents * 5) / 1_000) * 1_000
      : 0;
    if ((!bargain && unitCost > policies[level].maxStockPrice) || share === 0 || unitCost > (available + loanAmount) * share) {
      return {
        buy: false,
        quantity: 1,
        loanAmountCents: 0,
        reason: "цена акций и возможный рост не оправдывают вложение свободных денег"
      };
    }
    const quantity = Math.min(2_147_483_647, Math.floor(((available + loanAmount) * share) / unitCost));
    return {
      buy: true,
      quantity,
      loanAmountCents: loanAmount,
      reason: loanAmount > 0
        ? "дешёвые акции имеют большой запас роста; часть покупки финансирую посильным кредитом"
        : `покупаю ${quantity} акций с учётом цены и возможного роста`
    };
  }

  if (offer.cashflowCents <= 0) {
    return {
      buy: false,
      quantity: 1,
      loanAmountCents: 0,
      reason: "сделка не увеличивает ежемесячный денежный поток"
    };
  }

  const reserve = botDealReserve(state, level);
  const available = Math.max(0, state.cashCents - reserve);
  const paybackMonths = unitCost / offer.cashflowCents;
  const shortfall = Math.max(0, unitCost - available);
  const loanAmount = shortfall > 0
    ? Math.ceil(shortfall / 1_000) * 1_000
    : 0;
  const loanPayment = bankLoanPaymentCents(loanAmount);
  const netCashflow = offer.cashflowCents - loanPayment;
  const expertLoan = level === "expert_v1" &&
    state.monthlyCashflowCents - loanPayment + offer.cashflowCents >= 100 &&
    loanPayment <= state.monthlyCashflowCents &&
    loanAmount / Math.max(1, state.monthlyCashflowCents - loanPayment + offer.cashflowCents) <= 36;
  const affordableLoan = loanAmount === 0 || (
    loanAmount <= availableBankLoanCents(state.monthlyCashflowCents) &&
    (expertLoan || (loanPayment <= offer.cashflowCents * policies[level].loanPaymentShare &&
    loanPayment <= state.monthlyCashflowCents - 100))
  );
  const escapePlan = estimateBotEscapeCapital(state.totalExpensesCents, state.passiveIncomeCents ?? 0, unitCost, offer.cashflowCents);
  const closesIncomeGap = level === "expert_v1" &&
    (state.passiveIncomeCents ?? 0) < state.totalExpensesCents &&
    (state.passiveIncomeCents ?? 0) + offer.cashflowCents > state.totalExpensesCents;
  const escapeInvestment = level === "expert_v1" && escapePlan !== null && escapePlan.assetCount <= 3 &&
    escapePlan.capitalCents <= state.cashCents + Math.max(0, state.monthlyCashflowCents) * 12;
  const worthwhile = (paybackMonths <= policies[level].maxPayback || closesIncomeGap || escapeInvestment) &&
    (level === "expert_v1" ? state.monthlyCashflowCents + netCashflow >= 100 : netCashflow > 0) && affordableLoan;

  return worthwhile
    ? {
        buy: true,
        quantity: 1,
        loanAmountCents: loanAmount,
        reason: loanAmount > 0
          ? level === "expert_v1" ? "пассивный доход растёт, а свободного потока хватит на кредит и его погашение" : "доход сделки покрывает платёж по необходимому кредиту"
          : "сделка увеличивает денежный поток и сохраняет резерв"
      }
    : {
        buy: false,
        quantity: 1,
        loanAmountCents: 0,
        reason: "окупаемость или кредитная нагрузка не подходят стратегии"
      };
}

export function shouldAcceptBotCharity(
  state: BotFinancialSnapshot,
  donationCents: number,
  level: BotLevel = balancedBotStrategy,
  position?: number
) {
  const earlyExpert = level === "expert_v1" && (state.passiveIncomeCents ?? 0) < state.totalExpensesCents * 0.5 &&
    position !== undefined && position < 12;
  const accepted =
    state.monthlyCashflowCents > 0 &&
    state.cashCents - donationCents >= (earlyExpert ? botDealReserve(state, level) : botCashReserve(state, level));
  return {
    accepted,
    reason: accepted
      ? "пожертвование сохраняет резерв и даёт преимущество следующих ходов"
      : "пожертвование сократило бы необходимый денежный резерв"
  };
}

export function chooseBotDoodadPayment(
  state: BotFinancialSnapshot,
  cashPriceCents: number,
  level: BotLevel = balancedBotStrategy
) {
  const payment = state.cashCents - cashPriceCents >= botCashReserve(state, level)
    ? "cash"
    : "credit";
  return {
    payment,
    reason: payment === "cash"
      ? "после оплаты наличными сохраняется денежный резерв"
      : "кредит сохраняет наличные для обязательных расходов"
  } as const;
}

export function shouldSellBotMarketAsset(input: {
  proceedsCents: number;
  downPaymentCents: number;
  cashflowCents: number;
  passiveIncomeCents: number;
  totalExpensesCents: number;
}, level: BotLevel = balancedBotStrategy) {
  const nearEscape = input.passiveIncomeCents >= input.totalExpensesCents * 0.7;
  const incomeValue = input.cashflowCents * (nearEscape ? 60 : level === "expert_v1" ? 48 : 36);
  const profitable = input.proceedsCents >= Math.max(
    Math.max(1, input.downPaymentCents) * policies[level].saleProfit,
    incomeValue
  );
  const accepted = input.cashflowCents <= 0 || profitable;
  return {
    accepted,
    reason: accepted
      ? "выручка компенсирует потерю дохода и вложенные деньги"
      : "доход актива и прогресс к большому кругу ценнее предложенной выручки"
  };
}

export function minimumBotAuctionBid(input: {
  cashflowCents: number;
  buyerPassiveIncomeCents: number;
  buyerTotalExpensesCents: number;
}) {
  if (input.cashflowCents <= 0) return null;
  const reachesFastTrack =
    input.buyerPassiveIncomeCents < input.buyerTotalExpensesCents &&
    input.buyerPassiveIncomeCents + input.cashflowCents >= input.buyerTotalExpensesCents;
  return Math.max(500, input.cashflowCents * (reachesFastTrack ? 12 : 6));
}

export function botStockSaleQuantity(input: {
  availableQuantity: number;
  averageCostCents: number;
  salePriceCents: number;
}, level: BotLevel = balancedBotStrategy) {
  const profitable =
    input.salePriceCents >= Math.max(1, input.averageCostCents) * policies[level].saleProfit;
  return {
    quantity: profitable ? input.availableQuantity : 0,
    reason: profitable
      ? `цена продажи как минимум на ${Math.round((policies[level].saleProfit - 1) * 100)}% выше средней цены покупки`
      : `предложенная цена не достигла порога прибыли в ${Math.round((policies[level].saleProfit - 1) * 100)}%`
  };
}
