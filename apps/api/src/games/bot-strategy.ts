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

export function botCashReserve(state: BotFinancialSnapshot) {
  return Math.max(
    1_000,
    state.totalExpensesCents * 2,
    Math.abs(Math.min(0, state.monthlyCashflowCents)) * 3
  );
}

export function chooseBotDealType(state: BotFinancialSnapshot) {
  const available = state.cashCents - botCashReserve(state);
  return available >= Math.max(6_000, state.totalExpensesCents)
    ? "BIG_DEAL"
    : "SMALL_DEAL";
}

export function decideBotDeal(
  state: BotFinancialSnapshot,
  offer: BotDealOffer
): BotDealDecision {
  const reserve = botCashReserve(state);
  const available = Math.max(0, state.cashCents - reserve);
  const unitCost = Math.max(0, Math.round(offer.unitCostCents));

  if (unitCost <= 0) {
    return {
      buy: false,
      quantity: 1,
      loanAmountCents: 0,
      reason: "в карточке не удалось определить цену покупки"
    };
  }

  if (offer.isStock) {
    if (unitCost > available || unitCost > 40) {
      return {
        buy: false,
        quantity: 1,
        loanAmountCents: 0,
        reason: "цена акций слишком высока для сохранения денежного резерва"
      };
    }
    const targetQuantity = unitCost <= 5 ? 50 : unitCost <= 10 ? 20 : 10;
    const quantity = Math.max(1, Math.min(100, targetQuantity, Math.floor(available / unitCost)));
    return {
      buy: true,
      quantity,
      loanAmountCents: 0,
      reason: `цена позволяет купить ${quantity} акций без использования резерва`
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

  const paybackMonths = unitCost / offer.cashflowCents;
  const shortfall = Math.max(0, unitCost - available);
  const loanAmount = shortfall > 0
    ? Math.ceil(shortfall / 0.8 / 1_000) * 1_000
    : 0;
  const loanPayment = loanAmount / 10;
  const netCashflow = offer.cashflowCents - loanPayment;
  const affordableLoan = loanAmount <= Math.max(4_000, state.totalIncomeCents * 4);
  const worthwhile = paybackMonths <= 48 && netCashflow > 0 && affordableLoan;

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
