import { availableBankLoanCents, bankLoanPaymentCents } from "@cashflow/shared";

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
}

export interface BotDealOffer {
  title: string;
  isStock: boolean;
  unitCostCents: number;
  cashflowCents: number;
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
    if (unitCost > policies[level].maxStockPrice || unitCost > available * policies[level].stockShare) {
      return {
        buy: false,
        quantity: 1,
        loanAmountCents: 0,
        reason: "акции не дают пассивного дохода и займут слишком большую часть свободных денег"
      };
    }
    const quantity = Math.min(100, Math.floor((available * policies[level].stockShare) / unitCost));
    return {
      buy: true,
      quantity,
      loanAmountCents: 0,
      reason: `покупаю ${quantity} недорогих акций в пределах небольшой доли свободных денег`
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
  const affordableLoan = loanAmount === 0 || (
    loanAmount <= availableBankLoanCents(state.monthlyCashflowCents) &&
    loanPayment <= offer.cashflowCents * policies[level].loanPaymentShare &&
    loanPayment <= state.monthlyCashflowCents - 100
  );
  const closesIncomeGap = level === "expert_v1" &&
    (state.passiveIncomeCents ?? 0) < state.totalExpensesCents &&
    (state.passiveIncomeCents ?? 0) + netCashflow >= state.totalExpensesCents;
  const worthwhile = (paybackMonths <= policies[level].maxPayback || closesIncomeGap) && netCashflow > 0 && affordableLoan;

  return worthwhile
    ? {
        buy: true,
        quantity: 1,
        loanAmountCents: loanAmount,
        reason: loanAmount > 0
          ? "доход сделки покрывает платёж по необходимому кредиту"
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
  level: BotLevel = balancedBotStrategy
) {
  const accepted =
    state.monthlyCashflowCents > 0 &&
    state.cashCents - donationCents >= botCashReserve(state, level);
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
