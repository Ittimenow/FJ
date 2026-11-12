import { money } from "../../lib/format";

/** Presentation units stay explicit: legacy 101 uses dollars, authoritative 202 uses integer cents. */
export type FinancialPresentation = {
  gameType: "101" | "202";
  money: (value: number) => string;
  incomeReachedLabel: string;
  fastIncomeTarget: number;
};

export const classicFinancialPresentation: FinancialPresentation = {
  gameType: "101",
  money,
  incomeReachedLabel: "Пассивный доход выше расходов",
  fastIncomeTarget: 50_000
};

export const money202 = (cents: number) => new Intl.NumberFormat("ru-RU", {
  style: "currency", currency: "USD", maximumFractionDigits: cents % 100 ? 2 : 0
}).format(cents / 100);

export const advancedFinancialPresentation: FinancialPresentation = {
  gameType: "202",
  money: money202,
  incomeReachedLabel: "Пассивный доход не меньше двойных расходов",
  fastIncomeTarget: 5_000_000
};

export function freedomProgress(presentation: FinancialPresentation, passive: number, expenses: number, bankDebt: number, cash = 0) {
  const advanced = presentation.gameType === "202";
  const target = Math.max(1, advanced ? expenses * 2 : expenses + 1);
  const incomeReached = advanced ? passive >= expenses * 2 : passive > expenses;
  return { target, incomeReached, reached: incomeReached && bankDebt <= 0 && (!advanced || cash >= 0) };
}
