import { availableBankLoanCents, bankLoanPaymentCents } from "@cashflow/shared";

export const balancedBotStrategy = "balanced_v1";

export interface BotFinancialSnapshot {
  cashCents: number;
  totalIncomeCents: number;
  totalExpensesCents: number;
  monthlyCashflowCents: number;
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
  deal: { downPaymentCents: number; cashflowCents: number }
) {
  const availableForBid =
    state.cashCents - botCashReserve(state) - Math.max(0, deal.downPaymentCents);
  if (availableForBid < 100 || deal.cashflowCents <= 0) {
    return {
      amountCents: null,
      reason: "после покупки не останется безопасного резерва наличных"
    };
  }

  const valueBasedBid = Math.max(500, deal.cashflowCents * 6);
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

export function botCashReserve(state: BotFinancialSnapshot) {
  return Math.max(
    1_000,
    state.totalExpensesCents * 2,
    Math.abs(Math.min(0, state.monthlyCashflowCents)) * 3
  );
}

export function botDealReserve(state: BotFinancialSnapshot) {
  return Math.max(
    1_000,
    Math.ceil(state.totalExpensesCents * 0.35),
    Math.abs(Math.min(0, state.monthlyCashflowCents)) * 2
  );
}

export function chooseBotDealType(state: BotFinancialSnapshot) {
  const available = state.cashCents - botDealReserve(state);
  return available >= Math.max(8_000, state.totalExpensesCents * 1.5)
    ? "BIG_DEAL"
    : "SMALL_DEAL";
}

export function decideBotDeal(
  state: BotFinancialSnapshot,
  offer: BotDealOffer
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
    const available = Math.max(0, state.cashCents - botCashReserve(state));
    if (unitCost > 10 || unitCost > available * 0.15) {
      return {
        buy: false,
        quantity: 1,
        loanAmountCents: 0,
        reason: "акции не дают пассивного дохода и займут слишком большую часть свободных денег"
      };
    }
    const quantity = Math.min(100, Math.floor((available * 0.15) / unitCost));
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

  const reserve = botDealReserve(state);
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
    loanPayment <= offer.cashflowCents * 0.5 &&
    loanPayment <= state.monthlyCashflowCents - 100
  );
  const worthwhile = paybackMonths <= 72 && netCashflow > 0 && affordableLoan;

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
  donationCents: number
) {
  const accepted =
    state.monthlyCashflowCents > 0 &&
    state.cashCents - donationCents >= botCashReserve(state);
  return {
    accepted,
    reason: accepted
      ? "пожертвование сохраняет резерв и даёт преимущество следующих ходов"
      : "пожертвование сократило бы необходимый денежный резерв"
  };
}

export function chooseBotDoodadPayment(
  state: BotFinancialSnapshot,
  cashPriceCents: number
) {
  const payment = state.cashCents - cashPriceCents >= botCashReserve(state)
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
}) {
  const profitable = input.proceedsCents >= Math.max(1, input.downPaymentCents) * 1.2;
  const accepted = input.cashflowCents <= 0 || profitable;
  return {
    accepted,
    reason: accepted
      ? "рыночная цена даёт достаточную прибыль относительно вложения"
      : "текущий денежный поток актива ценнее предложенной прибыли"
  };
}

export function botStockSaleQuantity(input: {
  availableQuantity: number;
  averageCostCents: number;
  salePriceCents: number;
}) {
  const profitable =
    input.salePriceCents >= Math.max(1, input.averageCostCents) * 1.2;
  return {
    quantity: profitable ? input.availableQuantity : 0,
    reason: profitable
      ? "цена продажи как минимум на 20% выше средней цены покупки"
      : "предложенная цена недостаточно выше средней цены покупки"
  };
}
