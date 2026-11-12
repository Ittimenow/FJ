import type { GamePlayer } from "@/lib/types";
import { childExpenseCalculation } from "./child-expense";

export function expenseItems(player: GamePlayer): Array<{
  id: string;
  label: string;
  amountCents: number;
  calculation?: string | null;
}> {
  const profession = player.profession;
  const state = player.financialState;

  return [
    {
      id: "taxes",
      label: "Налоги",
      amountCents: profession?.taxesCents ?? 0
    },
    {
      id: "home_mortgage",
      label: "Оплата закладной на дом",
      amountCents:
        liabilityPayment(player, "home_mortgage") ??
        profession?.mortgagePaymentCents ??
        0
    },
    {
      id: "school_debt",
      label: "Оплата кредита на образование",
      amountCents:
        liabilityPayment(player, "school_debt") ??
        profession?.schoolLoanPaymentCents ??
        0
    },
    {
      id: "car_debt",
      label: "Оплата кредита на автомобиль",
      amountCents:
        liabilityPayment(player, "car_debt") ??
        profession?.carLoanPaymentCents ??
        0
    },
    {
      id: "credit_cards",
      label: "Выплаты по кредитной карточке",
      amountCents:
        liabilityPayment(player, "credit_cards") ??
        profession?.creditCardPaymentCents ??
        0
    },
    {
      id: "retail_debt",
      label: "Розничные расходы",
      amountCents:
        liabilityPayment(player, "retail_debt") ??
        profession?.retailPaymentCents ??
        0
    },
    {
      id: "other_expenses",
      label: "Другие расходы",
      amountCents: profession?.otherExpensesCents ?? 0
    },
    {
      id: "children",
      label: "Расходы на детей",
      amountCents:
        (state
          ? state.perChildCostCents * state.childrenCount
          : profession?.childrenExpenseCents) ?? 0,
      calculation: state
        ? childExpenseCalculation(state.childrenCount, state.perChildCostCents)
        : null
    },
    {
      id: "bank_loan",
      label: "Оплата кредита банка",
      amountCents: sumLiabilityPayments(player, "bank_loan")
    }
  ];
}

export function liabilityPayment(player: GamePlayer, type: string) {
  const liabilities = player.liabilities.filter((liability) => liability.type === type);
  if (liabilities.length > 0) {
    return liabilities.reduce((sum, liability) => sum + liability.paymentCents, 0);
  }
  return player.financialState ? 0 : null;
}

export function sumLiabilityPayments(player: GamePlayer, type: string) {
  return player.liabilities
    .filter((liability) => liability.type === type)
    .reduce((sum, liability) => sum + liability.paymentCents, 0);
}

export const liabilityLabels: Record<string, string> = {
  home_mortgage: "Закладная на дом",
  school_debt: "Кредит на образование",
  car_debt: "Кредит на автомобиль",
  credit_cards: "Кредитная карточка",
  retail_debt: "Розничный долг",
  bank_loan: "Оплата кредита банка"
};

export function repayableLiabilityRows(player: GamePlayer) {
  return [...player.liabilities]
    .filter((liability) => liability.balanceCents > 0)
    .sort((left, right) => {
      const leftOrder = liabilitySortOrder(left.type);
      const rightOrder = liabilitySortOrder(right.type);
      return leftOrder === rightOrder ? left.name.localeCompare(right.name) : leftOrder - rightOrder;
    });
}

export function liabilitySortOrder(type: string) {
  const order: Record<string, number> = {
    home_mortgage: 10,
    school_debt: 20,
    car_debt: 30,
    credit_cards: 40,
    retail_debt: 50,
    bank_loan: 60
  };
  return order[type] ?? 100;
}
