import { money } from "../../lib/format";

export function childExpenseCalculation(
  childrenCount: number,
  perChildCostCents: number
) {
  if (childrenCount <= 0) return null;

  return `${childrenCount} × ${money(perChildCostCents)} =`;
}
