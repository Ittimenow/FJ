import { Banknote } from "lucide-react";
import { cashChangeExpression, type CashChange } from "./game-event-result";

/** Shared arithmetic for 101 and 202; the caller explicitly supplies its money units. */
export function CashChangeVisualization({change,formatMoney}: {change:CashChange;formatMoney?:(value:number)=>string}) {
  if (change.deltaCents === 0) return null;
  const positive = change.deltaCents > 0;
  const expression = cashChangeExpression(change, formatMoney);
  return <div data-cash-change className="mt-1.5 inline-flex max-w-full min-w-0 flex-wrap items-center gap-2 text-sm [overflow-wrap:anywhere]">
    <Banknote size={16} className="shrink-0 text-neutral-500" data-inline-action-icon aria-hidden="true"/>
    {expression.kind === "equation" ? <>
      <strong className="tabular-nums">{expression.before}</strong>
      <span className={positive ? "font-semibold text-success" : "font-semibold text-red-700"}>{expression.operator}</span>
      <strong className={`tabular-nums ${positive ? "text-success" : "text-red-700"}`}>{expression.effect}</strong>
      <span className="sr-only">равно</span><span className="text-neutral-500" aria-hidden="true">=</span>
      <strong className="tabular-nums text-ink">{expression.after}</strong>
    </> : <strong className={positive ? "text-success" : "text-red-700"}>{expression.value}</strong>}
  </div>;
}
